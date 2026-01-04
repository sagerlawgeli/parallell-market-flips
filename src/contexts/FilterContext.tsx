import React, { createContext, useContext, useState, useEffect } from 'react';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import type { VisibilityFilterValue } from '../components/VisibilityFilter';
import type { PaymentMethodFilterValue } from '../components/PaymentMethodFilter';
import type { StatusFilterValue } from '../components/StatusFilter';
import type { DateRangePreset } from '../components/DateRangeFilter';

interface DateRange {
    start: Date | null;
    end: Date | null;
}

interface FilterState {
    visibilityFilter: VisibilityFilterValue;
    paymentMethodFilter: PaymentMethodFilterValue;
    statusFilter: StatusFilterValue;
    datePreset: DateRangePreset;
    dateRange: DateRange;
}

interface FilterContextType extends FilterState {
    setVisibilityFilter: (value: VisibilityFilterValue) => void;
    setPaymentMethodFilter: (value: PaymentMethodFilterValue) => void;
    setStatusFilter: (value: StatusFilterValue) => void;
    setDateFilter: (preset: DateRangePreset, range: DateRange) => void;
    // Special case for dashboard which defaults to 'done'
    setDashboardStatusFilter: (value: StatusFilterValue) => void;
    dashboardStatusFilter: StatusFilterValue;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

const STORAGE_KEY = 'arbitrage_filters';

const getDefaultDateRange = (preset: DateRangePreset): DateRange => {
    const now = new Date();
    switch (preset) {
        case 'today':
            return { start: startOfDay(now), end: endOfDay(now) };
        case 'yesterday':
            const yesterday = subDays(now, 1);
            return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
        case 'this_month':
            return { start: startOfMonth(now), end: endOfMonth(now) };
        case 'last_month':
            const lastMonth = subMonths(now, 1);
            return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
        case 'all':
        default:
            return { start: null, end: null };
    }
};

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Load initial state from localStorage
    const loadState = (): Partial<FilterState> & { dashboardStatusFilter?: StatusFilterValue } => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    ...parsed,
                    dateRange: {
                        start: parsed.dateRange?.start ? new Date(parsed.dateRange.start) : null,
                        end: parsed.dateRange?.end ? new Date(parsed.dateRange.end) : null,
                    }
                };
            }
        } catch (e) {
            console.error('Failed to load filters from localStorage', e);
        }
        return {};
    };

    const initialState = loadState();

    const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilterValue>(initialState.visibilityFilter || 'all');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethodFilterValue>(initialState.paymentMethodFilter || 'all');
    const [statusFilter, setStatusFilter] = useState<StatusFilterValue>(initialState.statusFilter || 'all');
    const [dashboardStatusFilter, setDashboardStatusFilter] = useState<StatusFilterValue>(initialState.dashboardStatusFilter || 'done');
    const [datePreset, setDatePreset] = useState<DateRangePreset>(initialState.datePreset || 'today');
    const [dateRange, setDateRange] = useState<DateRange>(initialState.dateRange || getDefaultDateRange(initialState.datePreset || 'today'));

    // Save state to localStorage whenever it changes
    useEffect(() => {
        const stateToSave = {
            visibilityFilter,
            paymentMethodFilter,
            statusFilter,
            dashboardStatusFilter,
            datePreset,
            dateRange
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, [visibilityFilter, paymentMethodFilter, statusFilter, dashboardStatusFilter, datePreset, dateRange]);

    const setDateFilter = (preset: DateRangePreset, range: DateRange) => {
        setDatePreset(preset);
        setDateRange(range);
    };

    return (
        <FilterContext.Provider value={{
            visibilityFilter,
            setVisibilityFilter,
            paymentMethodFilter,
            setPaymentMethodFilter,
            statusFilter,
            setStatusFilter,
            dashboardStatusFilter,
            setDashboardStatusFilter,
            datePreset,
            dateRange,
            setDateFilter
        }}>
            {children}
        </FilterContext.Provider>
    );
};

export const useFilters = () => {
    const context = useContext(FilterContext);
    if (context === undefined) {
        throw new Error('useFilters must be used within a FilterProvider');
    }
    return context;
};
