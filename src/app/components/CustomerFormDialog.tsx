import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useShop } from "../auth/ShopProvider";
import { createCustomer, updateCustomer, type CustomerInput } from "../data/customers";
import type { Customer, CustomerType } from "../data/types";

interface Props {
  trigger: ReactNode;
  /** Edit this customer; omit to add a new one. */
  customer?: Customer;
  onSaved: (customerId: string) => void;
}

/** Add-customer or edit-contact-info dialog. */
export function CustomerFormDialog({ trigger, customer, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? "Edit customer" : "Add customer"}</DialogTitle>
        </DialogHeader>
        {open && (
          <CustomerForm
            customer={customer}
            onDone={(id) => {
              setOpen(false);
              onSaved(id);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CustomerForm({ customer, onDone }: { customer?: Customer; onDone: (id: string) => void }) {
  const { shop } = useShop();
  const [form, setForm] = useState<CustomerInput>({
    name: customer?.name ?? "",
    type: customer?.type ?? "residential",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    address: customer?.address ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = (field: keyof CustomerInput) => (value: string) => setForm((f) => ({ ...f, [field]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Enter the customer's name");
    setSaving(true);
    try {
      let id: string;
      if (customer) {
        await updateCustomer(shop.id, customer.id, form);
        id = customer.id;
      } else {
        id = await createCustomer(shop.id, form);
      }
      toast.success(customer ? "Customer saved" : "Customer added");
      onDone(id);
    } catch (err) {
      toast.error(`Couldn't save the customer: ${(err as Error).message}`);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cust-name">Name</Label>
        <Input id="cust-name" className="h-11" value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="e.g. Johnson Residence" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cust-type">Type</Label>
        <Select value={form.type} onValueChange={(v) => set("type")(v as CustomerType)}>
          <SelectTrigger id="cust-type" className="h-11"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="residential">Residential</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cust-phone">Phone</Label>
        <Input id="cust-phone" className="h-11" type="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="(555) 123-4567" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cust-email">Email</Label>
        <Input id="cust-email" className="h-11" type="email" inputMode="email" value={form.email} onChange={(e) => set("email")(e.target.value)} placeholder="customer@email.com" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cust-address">Address</Label>
        <Input id="cust-address" className="h-11" value={form.address} onChange={(e) => set("address")(e.target.value)} placeholder="Street, city, state" />
      </div>
      <Button type="submit" className="w-full h-11" disabled={saving}>
        {saving ? "Saving…" : customer ? "Save changes" : "Add customer"}
      </Button>
    </form>
  );
}
