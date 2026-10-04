import type { Order } from '../types/dispatch';

export const orders: Order[] = [
// Waiting for planning
{ id: 'ORD-1024', store: 'FreshMart', district: 'Colombo 05', brand: 'Fresh', depot: 'Peliyagoda', windowEnd: '08:00', weightKg: 120, volumeM3: 2.4, boxes: 20, requiresVan: false, status: 'waiting' },
{ id: 'ORD-1025', store: 'FreshMart', district: 'Colombo 07', brand: 'Fresh', depot: 'Peliyagoda', windowEnd: '11:00', weightKg: 340, volumeM3: 5.6, boxes: 34, requiresVan: false, status: 'waiting' },
{ id: 'ORD-1026', store: 'GreenLeaf Grocers', district: 'Colombo 03', brand: 'Fresh', depot: 'Peliyagoda', windowStart: '10:00', windowEnd: '12:00', weightKg: 390, volumeM3: 6, boxes: 40, requiresVan: false, status: 'waiting' },
{ id: 'ORD-1027', store: 'Arctic Foods', district: 'Dehiwala', brand: 'Frozen', depot: 'Peliyagoda', windowEnd: '12:00', weightKg: 450, volumeM3: 6.5, boxes: 30, requiresVan: false, status: 'waiting' },
{ id: 'ORD-1028', store: 'City Pantry', district: 'Colombo 02', brand: 'Pantry', depot: 'Peliyagoda', windowEnd: '14:00', weightKg: 300, volumeM3: 4.2, boxes: 25, requiresVan: true, status: 'waiting' },
{ id: 'ORD-1029', store: 'Daily Needs', district: 'Nugegoda', brand: 'Pantry', depot: 'Peliyagoda', windowEnd: '15:00', weightKg: 800, volumeM3: 12, boxes: 60, requiresVan: false, status: 'waiting' },
{ id: 'ORD-1030', store: 'FreshMart', district: 'Battaramulla', brand: 'Fresh', depot: 'Peliyagoda', windowEnd: '13:00', weightKg: 280, volumeM3: 4.8, boxes: 28, requiresVan: false, status: 'waiting' },
{ id: 'ORD-1031', store: 'Arctic Foods', district: 'Wattala', brand: 'Frozen', depot: 'Peliyagoda', windowEnd: '14:00', weightKg: 500, volumeM3: 7, boxes: 35, requiresVan: false, status: 'waiting' },
{ id: 'ORD-1035', store: 'Daily Needs', district: 'Kiribathgoda', brand: 'Pantry', depot: 'Peliyagoda', windowEnd: '16:00', weightKg: 450, volumeM3: 7, boxes: 36, requiresVan: false, status: 'waiting' },
{ id: 'ORD-1036', store: 'GreenLeaf Grocers', district: 'Rajagiriya', brand: 'Fresh', depot: 'Peliyagoda', windowEnd: '12:00', weightKg: 210, volumeM3: 3.4, boxes: 22, requiresVan: false, status: 'waiting' },
{ id: 'ORD-1033', store: 'Hill Fresh', district: 'Kandy City', brand: 'Fresh', depot: 'Kandy', windowEnd: '11:00', weightKg: 260, volumeM3: 4.5, boxes: 26, requiresVan: false, status: 'waiting' },
{ id: 'ORD-1034', store: 'Corner Pantry', district: 'Peradeniya', brand: 'Pantry', depot: 'Kandy', windowEnd: '13:00', weightKg: 220, volumeM3: 3.5, boxes: 18, requiresVan: true, status: 'waiting' },

// On trips already
{ id: 'ORD-1010', store: 'FreshMart', district: 'Colombo 04', brand: 'Fresh', depot: 'Peliyagoda', windowEnd: '07:00', weightKg: 210, volumeM3: 3.5, boxes: 22, requiresVan: false, status: 'in_trip' },
{ id: 'ORD-1011', store: 'GreenLeaf Grocers', district: 'Colombo 06', brand: 'Fresh', depot: 'Peliyagoda', windowEnd: '07:30', weightKg: 180, volumeM3: 3, boxes: 18, requiresVan: false, status: 'in_trip' },
{ id: 'ORD-1012', store: 'FreshMart', district: 'Wellawatte', brand: 'Fresh', depot: 'Peliyagoda', windowEnd: '08:00', weightKg: 240, volumeM3: 4, boxes: 24, requiresVan: false, status: 'in_trip' },
{ id: 'ORD-1013', store: 'Arctic Foods', district: 'Kotte', brand: 'Frozen', depot: 'Peliyagoda', windowEnd: '07:00', weightKg: 300, volumeM3: 4.5, boxes: 20, requiresVan: false, status: 'in_trip' },
{ id: 'ORD-1014', store: 'Arctic Foods', district: 'Maharagama', brand: 'Frozen', depot: 'Peliyagoda', windowEnd: '07:00', weightKg: 320, volumeM3: 4.8, boxes: 22, requiresVan: false, status: 'in_trip' },
{ id: 'ORD-1015', store: 'Arctic Foods', district: 'Kottawa', brand: 'Frozen', depot: 'Peliyagoda', windowEnd: '08:00', weightKg: 260, volumeM3: 4, boxes: 18, requiresVan: false, status: 'in_trip' },
{ id: 'ORD-1016', store: 'Arctic Foods', district: 'Homagama', brand: 'Frozen', depot: 'Peliyagoda', windowEnd: '09:00', weightKg: 280, volumeM3: 4.2, boxes: 19, requiresVan: false, status: 'in_trip' },
{ id: 'ORD-1017', store: 'Daily Needs', district: 'Kelaniya', brand: 'Pantry', depot: 'Peliyagoda', windowEnd: '10:00', weightKg: 420, volumeM3: 7, boxes: 20, requiresVan: false, status: 'in_trip' },
{ id: 'ORD-1018', store: 'City Pantry', district: 'Ja-Ela', brand: 'Pantry', depot: 'Peliyagoda', windowEnd: '10:30', weightKg: 380, volumeM3: 6, boxes: 15, requiresVan: false, status: 'in_trip' },
{ id: 'ORD-1020', store: 'Daily Needs', district: 'Ragama', brand: 'Pantry', depot: 'Peliyagoda', windowEnd: '11:00', weightKg: 520, volumeM3: 8.5, boxes: 25, requiresVan: false, status: 'in_trip' },
{ id: 'ORD-1023', store: 'FreshMart', district: 'Colombo 01', brand: 'Fresh', depot: 'Peliyagoda', windowEnd: '08:30', weightKg: 260, volumeM3: 3.8, boxes: 18, requiresVan: true, status: 'in_trip' },
{ id: 'ORD-1009', store: 'GreenLeaf Grocers', district: 'Colombo 10', brand: 'Fresh', depot: 'Peliyagoda', windowEnd: '09:00', weightKg: 200, volumeM3: 3, boxes: 12, requiresVan: false, status: 'in_trip' },

// Deferred
{ id: 'ORD-1032', store: 'FreshMart', district: 'Colombo 08', brand: 'Fresh', depot: 'Peliyagoda', windowEnd: '09:00', weightKg: 300, volumeM3: 4.8, boxes: 26, requiresVan: false, status: 'deferred' },
{ id: 'ORD-1019', store: 'Arctic Foods', district: 'Moratuwa', brand: 'Frozen', depot: 'Peliyagoda', windowEnd: '10:00', weightKg: 700, volumeM3: 10, boxes: 40, requiresVan: false, status: 'deferred' },
{ id: 'ORD-1021', store: 'City Pantry', district: 'Colombo 11', brand: 'Pantry', depot: 'Peliyagoda', windowStart: '06:00', windowEnd: '07:00', weightKg: 240, volumeM3: 3.6, boxes: 16, requiresVan: true, status: 'deferred' },
{ id: 'ORD-1022', store: 'Hill Fresh', district: 'Katugastota', brand: 'Fresh', depot: 'Kandy', windowEnd: '09:00', weightKg: 280, volumeM3: 4.4, boxes: 24, requiresVan: false, status: 'deferred' }];