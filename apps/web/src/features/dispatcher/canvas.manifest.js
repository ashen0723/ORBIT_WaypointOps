export const manifest = {
  screens: {
    scr_6zvmsn: { name: "Dispatcher Overview", route: "/", position: { "x": 160, "y": 220 } },
    scr_31tdx2: { name: "Orders", route: "/orders", position: { "x": 160, "y": 4180 } },
    scr_nu66ej: { name: "Orders · Defer Order", route: "/orders", state: { "deferOrderId": "ORD-1036" }, position: { "x": 1560, "y": 4180 } },
    scr_zl6oqj: { name: "Plan Trip · Select Orders", route: "/planning", position: { "x": 160, "y": 10120 } },
    scr_7c1anj: { name: "Plan Trip · Vehicle Not Suitable", route: "/planning", state: { "planningPreset": "unsuitable" }, position: { "x": 1560, "y": 10120 } },
    scr_sl3046: { name: "Plan Trip · Cannot Add Order", route: "/planning", state: { "planningPreset": "incompatible" }, position: { "x": 5760, "y": 10120 } },
    scr_x79xjd: { name: "Plan Trip · Time Limit Exceeded", route: "/planning", state: { "planningPreset": "timeLimit" }, position: { "x": 7160, "y": 10120 } },
    scr_agh8ny: { name: "Plan Trip · Insufficient Fuel", route: "/planning", state: { "planningPreset": "fuel" }, position: { "x": 8560, "y": 10120 } },
    scr_53wsw5: { name: "Plan Trip · Review", route: "/planning", state: { "planningPreset": "review" }, position: { "x": 2960, "y": 10120 } },
    scr_kh39fz: { name: "Plan Trip · Confirmed", route: "/planning", state: { "planningPreset": "confirmed" }, position: { "x": 4360, "y": 10120 } },
    scr_db9h8f: { name: "Loading", route: "/loading", position: { "x": 2960, "y": 12100 } },
    scr_h11uic: { name: "Loading · Shortfall", route: "/loading/TRP-002", position: { "x": 160, "y": 12100 } },
    scr_gmuvbj: { name: "Loading · Complete", route: "/loading/TRP-003", position: { "x": 1560, "y": 12100 } },
    scr_7dlfm4: { name: "Delivery Monitoring", route: "/monitoring", position: { "x": 1560, "y": 14080 } },
    scr_h8yhl9: { name: "Monitoring · Delayed Trip", route: "/monitoring/TRP-004", position: { "x": 160, "y": 14080 } },
    scr_yokwoo: { name: "Deferred Orders", route: "/deferrals", position: { "x": 160, "y": 18040 } },
    scr_q3e03k: { name: "Vehicles", route: "/vehicles", position: { "x": 160, "y": 16060 } },
    scr_iiv4md: { name: "Capacity Forecast", route: "/forecast", position: { "x": 160, "y": 20020 } }
  },
  sections: {
    sec_hz545d: { name: "Navigation", x: 0, y: 0, width: 2920, height: 1180 },
    sec_n1iyy6: { name: "Place Order", x: 0, y: 1980, width: 5720, height: 1180 },
    sec_m3gcqr: { name: "Order Management", x: 0, y: 3960, width: 9920, height: 1180 },
    sec_hjn0uu: { name: "Order History", x: 0, y: 5940, width: 1520, height: 1180 },
    sec_13qrnw: { name: "Settings", x: 0, y: 7920, width: 5720, height: 1180 },
    sec_9jwoj9: { name: "Trip Planning", x: 0, y: 9900, width: 9920, height: 1180 },
    sec_bi50x5: { name: "Loading", x: 0, y: 11880, width: 4320, height: 1180 },
    sec_32mjqg: { name: "Monitoring", x: 0, y: 13860, width: 2920, height: 1180 },
    sec_kgzn6o: { name: "Vehicle Fleet", x: 0, y: 15840, width: 1520, height: 1180 },
    sec_dbgvp4: { name: "Deferrals", x: 0, y: 17820, width: 1520, height: 1180 },
    sec_s7hyqo: { name: "Capacity Forecast", x: 0, y: 19800, width: 1520, height: 1180 }
  },
  layers: [
  { kind: "section", id: "sec_hz545d", children: [
    { kind: "screen", id: "scr_6zvmsn" }]
  },
  { kind: "section", id: "sec_n1iyy6", children: [] },
  { kind: "section", id: "sec_m3gcqr", children: [
    { kind: "screen", id: "scr_31tdx2" },
    { kind: "screen", id: "scr_nu66ej" }]
  },
  { kind: "section", id: "sec_hjn0uu", children: [] },
  { kind: "section", id: "sec_13qrnw", children: [] },
  { kind: "section", id: "sec_9jwoj9", children: [
    { kind: "screen", id: "scr_zl6oqj" },
    { kind: "screen", id: "scr_7c1anj" },
    { kind: "screen", id: "scr_53wsw5" },
    { kind: "screen", id: "scr_kh39fz" },
    { kind: "screen", id: "scr_sl3046" },
    { kind: "screen", id: "scr_x79xjd" },
    { kind: "screen", id: "scr_agh8ny" }]
  },
  { kind: "section", id: "sec_bi50x5", children: [
    { kind: "screen", id: "scr_h11uic" },
    { kind: "screen", id: "scr_gmuvbj" },
    { kind: "screen", id: "scr_db9h8f" }]
  },
  { kind: "section", id: "sec_32mjqg", children: [
    { kind: "screen", id: "scr_h8yhl9" },
    { kind: "screen", id: "scr_7dlfm4" }]
  },
  { kind: "section", id: "sec_kgzn6o", children: [
    { kind: "screen", id: "scr_q3e03k" }]
  },
  { kind: "section", id: "sec_dbgvp4", children: [
    { kind: "screen", id: "scr_yokwoo" }]
  },
  { kind: "section", id: "sec_s7hyqo", children: [
    { kind: "screen", id: "scr_iiv4md" }]
  }]

};