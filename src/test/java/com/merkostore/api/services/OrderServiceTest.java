package com.merkostore.api.services;

import com.merkostore.api.dtos.CreateOrderRequest;
import com.merkostore.api.exceptions.InsufficientStockException;
import com.merkostore.api.exceptions.InvalidOrderStateException;
import com.merkostore.api.models.Order;
import com.merkostore.api.models.Product;
import com.merkostore.api.models.StoreConfig;
import com.merkostore.api.repositories.OrderRepository;
import com.merkostore.api.repositories.ProductRepository;
import com.merkostore.api.repositories.StoreConfigRepository;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

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
                .id("prod-1")
                .storeId("default-store")
                .name("Arroz Roa 1Kg")
                .price(new BigDecimal("5000"))
                .discountPrice(new BigDecimal("4500"))
                .stock(20)
                .isAvailable(true)
                .build();

        testConfig = StoreConfig.builder()
                .storeId("default-store")
                .storeName("Don Pedro - Tienda de Barrio")
                .deliveryFee(new BigDecimal("3000"))
                .minimumOrder(new BigDecimal("10000"))
                .isStoreOpen(true)
                .build();
    }

    @Test
    @DisplayName("Debe crear un pedido recalculando precios server-side y realizando descuento atómico de stock")
    void shouldCreateOrderWithServerSidePriceRecasting() {
        when(storeConfigRepository.findByStoreId("default-store")).thenReturn(Optional.of(testConfig));
        when(productRepository.findById("prod-1")).thenReturn(Optional.of(testProduct));
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), eq(Product.class))).thenReturn(testProduct);
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateOrderRequest request = CreateOrderRequest.builder()
                .storeId("default-store")
                .items(List.of(
                        CreateOrderRequest.OrderItemRequest.builder()
                                .productId("prod-1")
                                .quantity(3)
                                .build()
                ))
                .customer(CreateOrderRequest.CustomerDTO.builder()
                        .name("Juan Pérez")
                        .phone("3001234567")
                        .deliveryAddress("Calle 123 # 45 - 67")
                        .notes("Sin cebolla")
                        .build())
                .paymentMethod("CASH")
                .fulfillmentType("DELIVERY")
                .build();

        Order createdOrder = orderService.createOrder(request);

        assertNotNull(createdOrder);
        assertNotNull(createdOrder.getOrderNumber());
        assertEquals(new BigDecimal("13500"), createdOrder.getSubtotal()); // 3 x 4500 (discount price)
        assertEquals(new BigDecimal("3000"), createdOrder.getDeliveryFee()); // Delivery fee applied because subtotal < 30000
        assertEquals(new BigDecimal("16500"), createdOrder.getTotal());
        assertEquals(Order.OrderStatus.RECEIVED, createdOrder.getOrderStatus());
        assertEquals(Order.PaymentStatus.PENDING, createdOrder.getPaymentStatus());

        verify(mongoTemplate, times(1)).findAndModify(any(Query.class), any(Update.class), eq(Product.class));
        verify(orderRepository, times(1)).save(any(Order.class));
    }

    @Test
    @DisplayName("Debe rechazar la creación del pedido si el subtotal es menor al pedido mínimo configurado")
    void shouldRejectOrderBelowMinimumOrder() {
        testConfig.setMinimumOrder(new BigDecimal("50000"));
        when(storeConfigRepository.findByStoreId("default-store")).thenReturn(Optional.of(testConfig));
        when(productRepository.findById("prod-1")).thenReturn(Optional.of(testProduct));
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), eq(Product.class))).thenReturn(testProduct);

        CreateOrderRequest request = CreateOrderRequest.builder()
                .storeId("default-store")
                .items(List.of(
                        CreateOrderRequest.OrderItemRequest.builder()
                                .productId("prod-1")
                                .quantity(2) // 2 x 4500 = 9000 < 50000
                                .build()
                ))
                .customer(CreateOrderRequest.CustomerDTO.builder()
                        .name("Maria Gomez")
                        .phone("3109876543")
                        .deliveryAddress("Carrera 10 # 20")
                        .build())
                .paymentMethod("NEQUI")
                .fulfillmentType("DELIVERY")
                .build();

        assertThrows(IllegalArgumentException.class, () -> orderService.createOrder(request));
    }

    @Test
    @DisplayName("Debe rechazar el pedido si no hay stock suficiente en la comprobación inicial")
    void shouldRejectOrderWhenStockIsInsufficient() {
        testProduct.setStock(1);
        when(storeConfigRepository.findByStoreId("default-store")).thenReturn(Optional.of(testConfig));
        when(productRepository.findById("prod-1")).thenReturn(Optional.of(testProduct));

        CreateOrderRequest request = CreateOrderRequest.builder()
                .storeId("default-store")
                .items(List.of(
                        CreateOrderRequest.OrderItemRequest.builder()
                                .productId("prod-1")
                                .quantity(5)
                                .build()
                ))
                .customer(CreateOrderRequest.CustomerDTO.builder()
                        .name("Carlos Lopez")
                        .phone("3005554433")
                        .deliveryAddress("Calle 5 # 10")
                        .build())
                .paymentMethod("CASH")
                .fulfillmentType("DELIVERY")
                .build();

        assertThrows(InsufficientStockException.class, () -> orderService.createOrder(request));
    }

    @Test
    @DisplayName("Debe rechazar cambiar el estado de un pedido ya cancelado")
    void shouldRejectStatusChangeOnCancelledOrder() {
        Order cancelledOrder = Order.builder()
                .id("ord-99")
                .orderNumber("MS-1111")
                .orderStatus(Order.OrderStatus.CANCELLED)
                .build();

        when(orderRepository.findById("ord-99")).thenReturn(Optional.of(cancelledOrder));

        assertThrows(InvalidOrderStateException.class, () -> orderService.updateOrderStatus("ord-99", "PREPARING"));
    }
}
