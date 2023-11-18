export interface InvoiceItem {
  name: string,
  description: string,
  cost: number // cost is in pence
}

export interface Invoice {
  clientID: number,
  name: string,
  items: InvoiceItem[]
}

export interface CheckoutSession {
  url: string,
  id: string,
}
