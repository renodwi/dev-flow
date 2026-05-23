"use client";

import dynamic from "next/dynamic";

const DevFlowApp = dynamic(() => import("./devflow-app"), { ssr: false });

export default function AppEntry() {
  return <DevFlowApp />;
}
