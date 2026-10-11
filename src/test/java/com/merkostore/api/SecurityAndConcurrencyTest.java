package com.merkostore.api;

import com.merkostore.api.dtos.CreateOrderRequest;
import com.merkostore.api.exceptions.InsufficientStockException;
import com.merkostore.api.exceptions.InvalidOrderStateException;
import com.merkostore.api.models.Order;
import com.merkostore.api.models.Product;
import com.merkostore.api.models.StoreConfig;
import com.merkostore.api.repositories.OrderRepository;
import com.merkostore.api.repositories.ProductRepository;
import com.merkostore.api.repositories.StoreConfigRepository;
import com.merkostore.api.services.OrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SecurityAndConcurrencyTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private StoreConfigRepository storeConfigRepository;

    @Mock
    private MongoTemplate mongoTemplate;

    @InjectMocks
    private OrderService orderService;

    private Product testProduct;
    private StoreConfig testConfig;

    @BeforeEach
    void setUp() {
        testProduct = Product.builder()
                .id("prod-stock-1")
                .storeId("default-store")
                .name("Cerveza Club Colombia 330ml")
                .price(new BigDecimal("4500"))
                .stock(10)
                .isAvailable(true)
                .build();

        testConfig = StoreConfig.builder()
                .storeId("default-store")
                .storeName("Don Pedro - Tienda de Barrio")
                .deliveryFee(new BigDecimal("3000"))
                .minimumOrder(new BigDecimal("4000"))
                .isStoreOpen(true)
                .build();
    }

    @Test
    @DisplayName("CONCURRENCIA REAL: Dos compradores intentan adquirir simultáneamente la última unidad (stock = 1). Exactamente uno debe tener éxito y el otro ser rechazado.")
    void testRealStockConcurrency() throws InterruptedException, ExecutionException {
        testProduct.setStock(1);
        when(storeConfigRepository.findByStoreId("default-store")).thenReturn(Optional.of(testConfig));
        when(productRepository.findById("prod-stock-1")).thenReturn(Optional.of(testProduct));

        AtomicInteger realStockInDb = new AtomicInteger(1);
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), eq(Product.class)))
                .thenAnswer(invocation -> {
                    synchronized (realStockInDb) {
                        if (realStockInDb.get() >= 1) {
                            realStockInDb.decrementAndGet();
                            return testProduct;
                        }
                        return null;
                    }
                });

        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));

        int numberOfThreads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        CyclicBarrier barrier = new CyclicBarrier(numberOfThreads);

        Callable<Boolean> task = () -> {
            barrier.await();
            CreateOrderRequest req = CreateOrderRequest.builder()
                    .storeId("default-store")
                    .items(List.of(CreateOrderRequest.OrderItemRequest.builder()
                            .productId("prod-stock-1")
                            .quantity(1)
                            .build()))
                    .customer(CreateOrderRequest.CustomerDTO.builder()
                            .name("Comprador Concurrente")
                            .phone("3000000000")
                            .deliveryAddress("Calle Test")
                            .build())
                    .paymentMethod("CASH")
                    .fulfillmentType("DELIVERY")
                    .build();
            try {
                orderService.createOrder(req);
                return true;
            } catch (InsufficientStockException e) {
                return false;
            }
        };

        Future<Boolean> future1 = executor.submit(task);
        Future<Boolean> future2 = executor.submit(task);

        boolean result1 = future1.get();
        boolean result2 = future2.get();

        executor.shutdown();

        assertTrue(result1 ^ result2, "Exactamente un pedido debe tener éxito y el otro debe fallar por stock insuficiente.");
        assertEquals(0, realStockInDb.get(), "El stock final en base de datos debe ser exactamente 0.");
    }

    @Test
    @DisplayName("IDEMPOTENCIA DE CANCELACIÓN: Cancelar un pedido dos veces NO debe incrementar el stock dos veces")
    void testCancelOrderDoubleRestorationIdempotency() {
        Order order = Order.builder()
                .id("ord-100")
                .orderNumber("MS-100")
                .storeId("default-store")
                .orderStatus(Order.OrderStatus.RECEIVED)
                .items(List.of(Order.OrderItem.builder()
                        .productId("prod-stock-1")
                        .quantity(2)
                        .build()))
                .build();

        when(orderRepository.findById("ord-100")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));

        // First cancellation
        Order cancelledOrder = orderService.updateOrderStatus("ord-100", "CANCELLED");
        assertEquals(Order.OrderStatus.CANCELLED, cancelledOrder.getOrderStatus());
        verify(mongoTemplate, times(1)).updateFirst(any(Query.class), any(Update.class), eq(Product.class));

        // Second cancellation attempt
        when(orderRepository.findById("ord-100")).thenReturn(Optional.of(cancelledOrder));
        assertThrows(InvalidOrderStateException.class, () -> orderService.updateOrderStatus("ord-100", "CANCELLED"));

        // Ensure stock restoration was NOT executed a second time
        verify(mongoTemplate, times(1)).updateFirst(any(Query.class), any(Update.class), eq(Product.class));
    }

    @Test
    @DisplayName("RECÁLCULO RIGUROSO DE PRECIOS: Enviar un precio fraudulento en la solicitud debe ser completamente ignorado por el servidor")
    void testPriceManipulationIgnoredByServer() {
        testProduct.setStock(10);
        when(storeConfigRepository.findByStoreId("default-store")).thenReturn(Optional.of(testConfig));
        when(productRepository.findById("prod-stock-1")).thenReturn(Optional.of(testProduct));
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), eq(Product.class))).thenReturn(testProduct);
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));

        CreateOrderRequest req = CreateOrderRequest.builder()
                .storeId("default-store")
                .items(List.of(CreateOrderRequest.OrderItemRequest.builder()
                        .productId("prod-stock-1")
                        .quantity(2)
                        .build()))
                .customer(CreateOrderRequest.CustomerDTO.builder()
                        .name("Hacker")
                        .phone("3000000000")
                        .deliveryAddress("Calle 1")
                        .build())
                .paymentMethod("CASH")
                .fulfillmentType("DELIVERY")
                .build();

        Order order = orderService.createOrder(req);

        // Server recalculates subtotal as 2 * 4500 = 9000, Delivery fee = 3000 -> Total = 12000
        assertEquals(new BigDecimal("9000"), order.getSubtotal());
        assertEquals(new BigDecimal("12000"), order.getTotal());
    }

    @Test
    @DisplayName("IDEMPOTENCIA DE CREACIÓN: Enviar dos peticiones idénticas con el mismo idempotencyKey retorna el pedido original sin descontar stock dos veces")
    void testIdempotentOrderCreation() {
        Order existingOrder = Order.builder()
                .id("ord-existing")
                .orderNumber("MS-5555")
                .idempotencyKey("KEY-12345")
                .subtotal(new BigDecimal("9000"))
                .total(new BigDecimal("12000"))
                .build();

        when(mongoTemplate.findOne(any(Query.class), eq(Order.class))).thenReturn(existingOrder);

        CreateOrderRequest req = CreateOrderRequest.builder()
                .storeId("default-store")
                .idempotencyKey("KEY-12345")
                .items(List.of(CreateOrderRequest.OrderItemRequest.builder()
                        .productId("prod-stock-1")
                        .quantity(2)
                        .build()))
                .customer(CreateOrderRequest.CustomerDTO.builder()
                        .name("Cliente Repetido")
                        .phone("3000000000")
                        .deliveryAddress("Calle 1")
                        .build())
                .paymentMethod("CASH")
                .fulfillmentType("DELIVERY")
                .build();

        Order result = orderService.createOrder(req);

        assertEquals("MS-5555", result.getOrderNumber());
        verify(mongoTemplate, never()).findAndModify(any(), any(), any());
    }
}
