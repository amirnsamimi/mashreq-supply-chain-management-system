"use client";

import { useState } from "react";
import type { Supplier } from "@/lib/queries";
import { Button } from "@/components/geist";
import { NewInvoiceButton } from "./InvoicesClient";

export function NewInvoiceTrigger({ suppliers }: { suppliers: Supplier[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        + فاکتور جدید
      </Button>
      <NewInvoiceButton open={open} setOpen={setOpen} suppliers={suppliers} />
    </>
  );
}
