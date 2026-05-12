/**
 * Custom hook for managing order form submission and validation
 * Simplifies order creation in components
 */

import { useState } from 'react';
import { CreateOrderRequest, OrderResponse, OrderItemRequest } from '../types';
import { useOrder } from '../contexts/OrderContext';

interface UseOrderFormReturn {
    tableNumber: string;
    setTableNumber: (value: string) => void;
    staffName: string;
    setStaffName: (value: string) => void;
    orderNote: string;
    setOrderNote: (value: string) => void;
    items: OrderItemRequest[];
    addItem: (item: OrderItemRequest) => void;
    removeItem: (index: number) => void;
    updateItem: (index: number, item: OrderItemRequest) => void;
    isSubmitting: boolean;
    submitError: string | null;
    createdOrder: OrderResponse | null;
    submitOrder: () => Promise<void>;
    reset: () => void;
}

const defaultState = {
    tableNumber: '',
    staffName: '',
    orderNote: '',
    items: [] as OrderItemRequest[],
};

/**
 * Hook for managing order form state and submission
 * @returns Form state and handlers
 */
export function useOrderForm(): UseOrderFormReturn {
    const { createOrder, error: contextError, clearError } = useOrder();
    const [tableNumber, setTableNumber] = useState(defaultState.tableNumber);
    const [staffName, setStaffName] = useState(defaultState.staffName);
    const [orderNote, setOrderNote] = useState(defaultState.orderNote);
    const [items, setItems] = useState<OrderItemRequest[]>(defaultState.items);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdOrder, setCreatedOrder] = useState<OrderResponse | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const addItem = (item: OrderItemRequest) => {
        setItems((prev) => [...prev, item]);
    };

    const removeItem = (index: number) => {
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, item: OrderItemRequest) => {
        setItems((prev) => {
            const updated = [...prev];
            updated[index] = item;
            return updated;
        });
    };

    const validateForm = (): boolean => {
        if (!tableNumber.trim()) {
            setSubmitError('Table number is required');
            return false;
        }

        if (!staffName.trim()) {
            setSubmitError('Staff name is required');
            return false;
        }

        if (items.length === 0) {
            setSubmitError('At least one item is required');
            return false;
        }

        // Validate each item
        for (const item of items) {
            if (item.quantity < 1) {
                setSubmitError(`Invalid quantity for ${item.name}`);
                return false;
            }

            if (!item.menuItemId) {
                setSubmitError(`Missing menu item ID for ${item.name}`);
                return false;
            }
        }

        return true;
    };

    const submitOrder = async () => {
        clearError();
        setSubmitError(null);

        // Validate form
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const request: CreateOrderRequest = {
                tableNumber,
                staffName,
                items,
                note: orderNote.trim() || undefined,
            };

            const order = await createOrder(request);
            setCreatedOrder(order);

            // Reset form after successful submission
            reset();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create order';
            setSubmitError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const reset = () => {
        setTableNumber(defaultState.tableNumber);
        setStaffName(defaultState.staffName);
        setOrderNote(defaultState.orderNote);
        setItems(defaultState.items);
        setSubmitError(null);
        setCreatedOrder(null);
        clearError();
    };

    return {
        tableNumber,
        setTableNumber,
        staffName,
        setStaffName,
        orderNote,
        setOrderNote,
        items,
        addItem,
        removeItem,
        updateItem,
        isSubmitting,
        submitError,
        createdOrder,
        submitOrder,
        reset,
    };
}
