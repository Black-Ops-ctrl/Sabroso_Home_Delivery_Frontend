export const DELIVERY_STATUS = {
  AVAILABLE: { label: "Available", cls: "b-green" },
  ORDER_ASSIGNED: { label: "Order Assigned", cls: "b-amber" },
  ON_DELIVERY: { label: "On Delivery", cls: "b-plum" },
};
export const deliveryStatus = (s) => DELIVERY_STATUS[s] || DELIVERY_STATUS.AVAILABLE;
