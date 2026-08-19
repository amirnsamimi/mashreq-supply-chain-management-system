"use client";

import { useState } from "react";
import { Button } from "@/components/geist";
import { NewShipmentModal } from "./ShipmentsClient";

export function NewShipmentTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        + پارت جدید
      </Button>
      <NewShipmentModal open={open} setOpen={setOpen} />
    </>
  );
}
