import { useState, type FormEvent, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useShop } from "../auth/ShopProvider";
import { listCustomers } from "../data/customers";
import { computeEstimateTotals, createEstimate, lineTotal } from "../data/estimates";
import { useAsync } from "../data/useAsync";
import { LINE_ITEM_KINDS, labelFor, type EstimateItemInput, type LineItemKind } from "../data/types";
import { formatMoney, toDateInputValue } from "../format";

interface Props {
  trigger: ReactNode;
  onCreated: (estimateId: string) => void;
}

/** Builds a draft estimate by hand. Saving never sends anything to the customer. */
export function CreateEstimateDialog({ trigger, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New estimate</DialogTitle>
          <DialogDescription>Saved as a draft. Nothing is sent to the customer.</DialogDescription>
        </DialogHeader>
        {open && (
          <EstimateForm
            onDone={(id) => {
              setOpen(false);
              onCreated(id);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ItemDraft {
  key: number;
  kind: LineItemKind;
  description: string;
  quantity: string;
  unitPrice: string;
}

/** Parses a draft row; null if quantity or price isn't a usable number yet. */
function parseItem(item: ItemDraft): EstimateItemInput | null {
  const quantity = Number(item.quantity);
  const unitPrice = Number(item.unitPrice);
  if (item.quantity.trim() === "" || item.unitPrice.trim() === "") return null;
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return null;
  // The columns hold 2 decimals; round here so the preview matches what's saved.
  const cents = (n: number) => Math.round(n * 100) / 100;
  return { kind: item.kind, description: item.description, quantity: cents(quantity), unitPrice: cents(unitPrice) };
}

function EstimateForm({ onDone }: { onDone: (id: string) => void }) {
  const { shop } = useShop();
  const customers = useAsync(() => listCustomers(shop.id), [shop.id]);
  const [customerId, setCustomerId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return toDateInputValue(d);
  });
  const [nextKey, setNextKey] = useState(1);
  const [items, setItems] = useState<ItemDraft[]>([
    { key: 0, kind: "material", description: "", quantity: "1", unitPrice: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const laborRate = shop.laborRate;
  const parsed = items.map(parseItem);
  const totals = computeEstimateTotals(
    parsed.filter((i): i is EstimateItemInput => i !== null),
    shop.taxRate,
  );
  const taxPercent = `${+(shop.taxRate * 100).toFixed(3)}%`;

  const addItem = (kind: LineItemKind) => {
    setItems((list) => [
      ...list,
      {
        key: nextKey,
        kind,
        description: kind === "labor" ? "Labor" : "",
        quantity: "1",
        unitPrice: kind === "labor" && laborRate !== null ? String(laborRate) : "",
      },
    ]);
    setNextKey((k) => k + 1);
  };

  const updateItem = (key: number, patch: Partial<ItemDraft>) =>
    setItems((list) =>
      list.map((item) => {
        if (item.key !== key) return item;
        const next = { ...item, ...patch };
        // Switching a blank row to labor fills in the shop's hourly rate.
        if (patch.kind === "labor" && item.unitPrice.trim() === "" && laborRate !== null) {
          next.unitPrice = String(laborRate);
        }
        return next;
      }),
    );

  const removeItem = (key: number) => setItems((list) => list.filter((i) => i.key !== key));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!customerId) return toast.error("Pick a customer");
    if (!title.trim()) return toast.error("Give the estimate a title");
    if (items.length === 0) return toast.error("Add at least one line item");
    if (parsed.some((i) => i === null)) return toast.error("Every line item needs a quantity and a price");
    const ready = parsed as EstimateItemInput[];
    if (ready.some((i) => !i.description.trim())) return toast.error("Every line item needs a description");
    if (ready.some((i) => i.quantity <= 0)) return toast.error("Quantities must be more than 0");
    if (ready.some((i) => i.unitPrice < 0)) return toast.error("Prices can't be negative");

    setSaving(true);
    try {
      const id = await createEstimate(shop.id, {
        customerId,
        title,
        description,
        taxRate: shop.taxRate,
        validUntil: validUntil || null,
        items: ready,
      });
      toast.success("Draft estimate saved");
      onDone(id);
    } catch (err) {
      toast.error(`Couldn't save the estimate: ${(err as Error).message}`);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="est-customer">Customer</Label>
        <Select value={customerId} onValueChange={setCustomerId}>
          <SelectTrigger id="est-customer" className="h-11">
            <SelectValue placeholder={customers.loading ? "Loading customers…" : "Select customer"} />
          </SelectTrigger>
          <SelectContent>
            {(customers.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {customers.error && <p className="text-sm text-destructive">Couldn't load customers: {customers.error.message}</p>}
        {customers.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">Add a customer first on the Customers page.</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="est-title">Title</Label>
        <Input id="est-title" className="h-11" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 200A panel upgrade" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="est-description">Description</Label>
        <Textarea id="est-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Scope of work" />
      </div>

      <div className="border-t pt-4 space-y-3">
        <h3 className="font-medium">Line items</h3>
        {items.map((item, index) => {
          const p = parsed[index];
          return (
            <div key={item.key} className="rounded-lg bg-muted/50 p-3 space-y-3">
              {/* Phone: kind + remove on one row, description below. Wider: one row. */}
              <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[9rem_1fr_auto] gap-2">
                <div>
                  <Label htmlFor={`kind-${item.key}`} className="sr-only">Kind</Label>
                  <Select value={item.kind} onValueChange={(v) => updateItem(item.key, { kind: v as LineItemKind })}>
                    <SelectTrigger id={`kind-${item.key}`} className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LINE_ITEM_KINDS.map((k) => <SelectItem key={k} value={k}>{labelFor(k)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 order-last sm:col-span-1 sm:order-none min-w-0">
                  <Label htmlFor={`desc-${item.key}`} className="sr-only">Description</Label>
                  <Input
                    id={`desc-${item.key}`}
                    className="h-11"
                    value={item.description}
                    onChange={(e) => updateItem(item.key, { description: e.target.value })}
                    placeholder="Description"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0"
                  onClick={() => removeItem(item.key)}
                  aria-label="Remove line item"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 items-end">
                <div className="space-y-1">
                  <Label htmlFor={`qty-${item.key}`} className="text-xs">{item.kind === "labor" ? "Hours" : "Qty"}</Label>
                  <Input
                    id={`qty-${item.key}`}
                    className="h-11"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.key, { quantity: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`price-${item.key}`} className="text-xs">{item.kind === "labor" ? "Rate ($/hr)" : "Unit price ($)"}</Label>
                  <Input
                    id={`price-${item.key}`}
                    className="h-11"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.key, { unitPrice: e.target.value })}
                  />
                </div>
                <div className="space-y-1 text-right">
                  <div className="text-xs text-muted-foreground">Line total</div>
                  <div className="h-11 flex items-center justify-end font-medium">
                    {p ? formatMoney(lineTotal(p.quantity, p.unitPrice)) : "—"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="h-11" onClick={() => addItem("material")}>
            <Plus className="w-4 h-4" /> Add item
          </Button>
          <Button type="button" variant="outline" className="h-11" onClick={() => addItem("labor")}>
            <Plus className="w-4 h-4" /> Add labor
            {laborRate !== null && <span className="text-muted-foreground">({formatMoney(laborRate)}/hr)</span>}
          </Button>
        </div>
        {laborRate === null && (
          <p className="text-xs text-muted-foreground">Your shop has no labor rate set, so labor rows start blank.</p>
        )}
      </div>

      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatMoney(totals.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax ({taxPercent})</span>
          <span className="font-medium">{formatMoney(totals.tax)}</span>
        </div>
        <div className="flex justify-between text-lg">
          <span className="font-semibold">Total</span>
          <span className="font-bold">{formatMoney(totals.total)}</span>
        </div>
      </div>

      <div className="space-y-1.5 sm:max-w-xs">
        <Label htmlFor="est-valid">Valid until</Label>
        <Input id="est-valid" className="h-11" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
      </div>

      <Button type="submit" className="w-full h-11" disabled={saving}>
        {saving ? "Saving…" : "Save as draft"}
      </Button>
    </form>
  );
}
