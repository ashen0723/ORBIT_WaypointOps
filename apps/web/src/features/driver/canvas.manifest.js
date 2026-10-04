export const manifest = {
  screens: {
    scr_6tgsth: { name: "Today's trips", route: "/" },
    scr_pisli6: { name: "Pre-departure check", route: "/trips/trip-1/check" },
    scr_6slkki: { name: "Current stop — not started", route: "/current-stop" },
    scr_0p2a8b: { name: "Route — next stop", route: "/trips/trip-1/stops", state: { "scenario": "departed" } },
    scr_kazzgl: { name: "Stop detail", route: "/trips/trip-1/stops/3", state: { "scenario": "departed" } },
    scr_jhxs76: { name: "Stop detail — arrived", route: "/trips/trip-1/stops/3", state: { "scenario": "arrived" } },
    scr_8aayqg: { name: "Record delivery", route: "/trips/trip-1/stops/3/delivery", state: { "scenario": "arrived" } },
    scr_pqy9ti: { name: "Lost signal — offline", route: "/trips/trip-1/stops", state: { "scenario": "offline" } },
    scr_5jpdxf: { name: "Route changed — conflict", route: "/trips/trip-1/stops", state: { "scenario": "conflict" } },
    scr_xbhbor: { name: "Trip complete", route: "/trips/trip-1/complete", state: { "scenario": "tripComplete" } },
    scr_kno2z4: { name: "Trip 2 check", route: "/trips/trip-2/check", state: { "scenario": "tripComplete" } },
    scr_k8xf5s: { name: "Report issue", route: "/report-issue" },
    scr_9dpalp: { name: "Report issue — offline", route: "/report-issue?offline=1" },
    scr_nevx49: { name: "Dashboard Lab", route: "/dashboard-lab" },
    scr_mlcr4a: { name: "Dashboard Lab — on route", route: "/dashboard-lab", state: { "scenario": "departed" } },
    scr_9yxqwl: { name: "Profile", route: "/profile" },
    scr_72lgtp: { name: "Safe-use mode", route: "/safe-use" }
  }
};