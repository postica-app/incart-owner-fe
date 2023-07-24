import { useSearchParams } from 'react-router-dom'
import { Vexile, Hexile } from '@haechi/flexile'
import { useMemo, useEffect } from 'react'
import { supabase } from '@/supabase'
import { useFormik } from 'formik'
import { z } from 'zod'
import {
    ORDER_STAGE_MAP,
    FormikContext,
    ProductType,
    OrderStage,
    FormField,
    FSwitch,
    Header2,
    FInput,
} from 'incart-fe-common'
import { Table } from '@/types'

export const OrderFilter = z.object({
    range_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    range_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    product_id: z.string().uuid().optional(),
    order_stage: z
        .enum([
            OrderStage.created,
            OrderStage.paid,
            OrderStage.departed,
            OrderStage.canceled,
        ])
        .optional(),
    rid: z.string().uuid().optional(),
    orderer_name: z.string().optional(),
    orderer_phone: z.string().optional(),
    orderer_email: z.string().optional(),
    receiver_name: z.string().optional(),
    receiver_phone: z.string().optional(),
    shipping_info: z.string().optional(),
})

export default {
    async getOrdersWithFilter(filter: z.infer<typeof OrderFilter>) {
        console.log(filter)
        let query = supabase
            .from('order_sheet')
            .select(
                `
                rid,
                id,
                orderer_name,
                shipping_info,
                stage,
                orderer_phone,
                orderer_email,
                receiver_name,
                receiver_phone,
                created_at,
                order_item(amount, selected_options, product)`
            )
            .gte('created_at', filter.range_start)
            .lte('created_at', filter.range_end)

        if (filter.order_stage) query = query.eq('stage', filter.order_stage)

        if (filter.rid) query = query.textSearch('rid', filter.rid)

        if (filter.orderer_name)
            query = query.like('orderer_name', `%${filter.orderer_name}%`)

        if (filter.orderer_phone)
            query = query.like('orderer_phone', `%${filter.orderer_phone}%`)

        if (filter.orderer_email)
            query = query.like('orderer_email', `%${filter.orderer_email}%`)

        const { data: orders, error: orderError } = await query.returns<
            (Table['order_sheet'] & {
                order_item: Table['order_item'][]
            })[]
        >()

        if (orders === null || orderError) {
            console.error('오류 발생!', orderError)
            throw new Error(
                orderError?.message || 'Error while fetching orders'
            )
        }

        const orderIds = orders.map((order) => order.id)

        const productIdFilter = filter.product_id

        let orderItemsQuery = supabase
            .from('order_item')
            .select('product_id, order_id, amount, selected_options, product')
            .in('order_id', orderIds)

        if (productIdFilter) {
            orderItemsQuery = orderItemsQuery.eq('product_id', productIdFilter)
        }

        const { data: orderItems, error: orderItemsError } =
            await orderItemsQuery

        if (orderItems === null || orderItemsError) {
            throw new Error(
                orderItemsError?.message ||
                    'Error while fetching order products'
            )
        }

        type OrderItemType = (typeof orderItems)[number] & {
            product: ProductType
            selected_options: string[]
        }

        const orderItemsMap = orderItems.reduce((acc, item) => {
            if (!acc[item.order_id]) {
                acc[item.order_id] = []
            }

            acc[item.order_id].push(item as OrderItemType)

            return acc
        }, {} as Record<string, OrderItemType[]>)

        if (!productIdFilter) {
            return orders.map((order) => ({
                ...order,
                items: orderItemsMap[order.id] || [],
            }))
        }

        const filteredOrders = orders.filter((order) =>
            orderItemsMap[order.id]?.some(
                (orderProduct) => orderProduct.product_id === productIdFilter
            )
        )

        return filteredOrders.map((order) => ({
            ...order,
            items: orderItemsMap[order.id] || [],
        }))
    },
    useFilter() {
        const [_, setSearchParams] = useSearchParams()

        const initialValues = useMemo(() => {
            const params = Object.fromEntries(
                new URLSearchParams(location.search).entries()
            )
            const requiredField = {
                range_start: new Date(
                    new Date().getTime() - 70 * 24 * 60 * 60 * 1000
                )
                    .toISOString()
                    .substring(0, 10),
                range_end: new Date().toISOString().substring(0, 10),
            }

            try {
                return OrderFilter.parse({
                    ...requiredField,
                    ...params,
                })
            } catch {
                return requiredField
            }
        }, [])

        const formik = useFormik<z.infer<typeof OrderFilter>>({
            initialValues,
            validateOnChange: true,
            onSubmit: () => {},
        })

        useEffect(() => {
            setSearchParams((prev) => ({
                ...Object.fromEntries(prev.entries()),
                ...formik.values,
            }))
        }, [formik.values])

        const view = (
            <FormikContext.Provider value={formik}>
                <form
                    onSubmit={formik.handleSubmit}
                    style={{ width: '103rem' }}
                >
                    <Vexile gap={5}>
                        <Header2>상세 검색</Header2>
                        <Hexile gap={3}>
                            <FormField name="기간 시작" fillx>
                                <FInput name="range_start" type="date" />
                            </FormField>
                            <FormField name="끝" fillx>
                                <FInput name="range_end" type="date" />
                            </FormField>
                        </Hexile>
                        <FormField name="주문 상태">
                            <FSwitch
                                name="order_stage"
                                items={Object.entries(ORDER_STAGE_MAP).map(
                                    ([key, value]) => ({
                                        key,
                                        name: value,
                                    })
                                )}
                            />
                        </FormField>
                        <FormField name="주문자 이메일">
                            <FInput name="orderer_email" />
                        </FormField>
                        <FormField name="주문자 이름">
                            <FInput name="orderer_name" />
                        </FormField>
                        <FormField name="주문자 전화번호">
                            <FInput name="orderer_phone" />
                        </FormField>
                        <FormField name="수령자 이름">
                            <FInput name="receiver_name" />
                        </FormField>
                        <FormField name="수령자 전화번호">
                            <FInput name="receiver_phone" />
                        </FormField>
                    </Vexile>
                </form>
            </FormikContext.Provider>
        )

        return [formik.values, view] as const
    },
}
