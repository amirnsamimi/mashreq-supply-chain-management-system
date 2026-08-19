"use client";

import { useState } from "react";
import { Button } from "@/components/geist";
import { NewShipmentModal } from "./ShipmentsClient";
import { useOpenParam } from "@/components/useOpenParam";

export function NewShipmentTrigger() {
  const [open, setOpen] = useOpenParam("shipment");
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        + پارت جدید
      </Button>
      <NewShipmentModal open={open} setOpen={setOpen} />
    </>
  );
}
