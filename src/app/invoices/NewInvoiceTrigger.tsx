"use client";

import { useState } from "react";
import { Button } from "@/components/geist";
import { NewInvoiceButton } from "./InvoicesClient";

export function NewInvoiceTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        + فاکتور جدید
      </Button>
      <NewInvoiceButton open={open} setOpen={setOpen} />
    </>
  );
}
