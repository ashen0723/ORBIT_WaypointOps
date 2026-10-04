export const manifest = {
  screens: {
    scr_zl7afx: { name: "Dashboard", route: "/dashboard", position: { "x": 1560, "y": 220 } },
    scr_x1fjrv: { name: "My Orders", route: "/", position: { "x": 160, "y": 220 }, width: 1200, height: 1276 },
    scr_guy1lp: { name: "Place Order · Fresh Dry", route: "/place-order", state: { "brand": "Fresh", "freshType": "dry" }, position: { "x": 160, "y": 2200 } },
    scr_wjeqv1: { name: "Place Order · Fresh Chilled", route: "/place-order", state: { "brand": "Fresh", "freshType": "chilled" }, position: { "x": 1560, "y": 2200 } },
    scr_9vbr8d: { name: "Place Order · Style", route: "/place-order", state: { "brand": "Style", "freshType": "dry" }, position: { "x": 2960, "y": 2200 } },
    scr_v9z88l: { name: "Place Order · Tech", route: "/place-order", state: { "brand": "Tech", "freshType": "dry" }, position: { "x": 4360, "y": 2200 } },
    scr_g3iom0: { name: "Order Confirmation", route: "/orders/ORD0092307/confirmation", position: { "x": 160, "y": 4180 } },
    scr_8rrw01: { name: "Order Status · Placed", route: "/orders/ORD0092325", position: { "x": 1560, "y": 4180 } },
    scr_er7gvi: { name: "Order Status · Planned", route: "/orders/ORD0092322", position: { "x": 2960, "y": 4180 } },
    scr_0lp9y3: { name: "Order Status · In Transit", route: "/orders/ORD0092315", position: { "x": 4360, "y": 4180 } },
    scr_omzw0y: { name: "Order Status · Delivered", route: "/orders/ORD0092308", position: { "x": 5760, "y": 4180 } },
    scr_xhsozh: { name: "Delivery Deferred", route: "/orders/ORD0092296/deferral", position: { "x": 7160, "y": 4180 } },
    scr_s8wr03: { name: "Confirm Receipt", route: "/orders/ORD0092308/receipt", position: { "x": 8560, "y": 4180 } },
    scr_gb5zom: { name: "Order History", route: "/history", position: { "x": 160, "y": 6160 } },
    scr_1ztgkb: { name: "Profile Settings", route: "/settings", state: { "active": "profile" }, position: { "x": 160, "y": 8140 } },
    scr_d1704v: { name: "Security Settings", route: "/settings", state: { "active": "security" }, position: { "x": 1560, "y": 8140 } },
    scr_uw87w5: { name: "Notification Settings", route: "/settings", state: { "active": "notifications" }, position: { "x": 2960, "y": 8140 } }
  },
  sections: {
    sec_hz545d: { name: "Navigation", x: 0, y: 0, width: 2920, height: 1180 },
    sec_n1iyy6: { name: "Place Order", x: 0, y: 1980, width: 5720, height: 1180 },
    sec_m3gcqr: { name: "Order Management", x: 0, y: 3960, width: 9920, height: 1180 },
    sec_hjn0uu: { name: "Order History", x: 0, y: 5940, width: 1520, height: 1180 },
    sec_13qrnw: { name: "Settings", x: 0, y: 7920, width: 5720, height: 1180 }
  },
  layers: [
  { kind: "section", id: "sec_hz545d", children: [
    { kind: "screen", id: "scr_x1fjrv" },
    { kind: "screen", id: "scr_zl7afx" }]
  },
  { kind: "section", id: "sec_n1iyy6", children: [
    { kind: "screen", id: "scr_guy1lp" },
    { kind: "screen", id: "scr_wjeqv1" },
    { kind: "screen", id: "scr_9vbr8d" },
    { kind: "screen", id: "scr_v9z88l" }]
  },
  { kind: "section", id: "sec_m3gcqr", children: [
    { kind: "screen", id: "scr_g3iom0" },
    { kind: "screen", id: "scr_8rrw01" },
    { kind: "screen", id: "scr_er7gvi" },
    { kind: "screen", id: "scr_0lp9y3" },
    { kind: "screen", id: "scr_omzw0y" },
    { kind: "screen", id: "scr_xhsozh" },
    { kind: "screen", id: "scr_s8wr03" }]
  },
  { kind: "section", id: "sec_hjn0uu", children: [
    { kind: "screen", id: "scr_gb5zom" }]
  },
  { kind: "section", id: "sec_13qrnw", children: [
    { kind: "screen", id: "scr_1ztgkb" },
    { kind: "screen", id: "scr_d1704v" },
    { kind: "screen", id: "scr_uw87w5" },
    { kind: "screen", id: "scr_fq4zaf" }]
  }]

};