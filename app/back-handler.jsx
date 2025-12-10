"use client";

import { App } from "@capacitor/app";
import { useEffect } from "react";

export default function BackHandler() {
  useEffect(() => {
    const handler = App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    return () => {
      handler.then(h => h.remove());
    };
  }, []);

  return null;
}
