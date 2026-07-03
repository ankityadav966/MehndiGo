# Chat Communication Rules & Permissions

This document outlines the business rules governing chat functionality between Customers and Artists in the MehndiGo application.

## 1. Booking Status Transitions

Chat capability is directly tied to the status of the booking:

| Booking Status | Detailed Status | Chat Allowed | Note |
| :--- | :--- | :---: | :--- |
| `PENDING` | `PENDING` | **Yes** | Pre-booking alignment and discussion. |
| `CONFIRMED` | `ARTIST_ACCEPTED` / `CONFIRMED` | **Yes** | Standard discussion during accepted event. |
| `CONFIRMED` | `ARTIST_ON_THE_WAY` | **Yes** | Real-time coordination. |
| `CONFIRMED` | `SERVICE_STARTED` | **Yes** | Real-time coordination. |
| `CANCELLED` | `CANCELLED` | **No** | Chat disabled permanently. |
| `REJECTED` | `REJECTED` | **No** | Chat disabled permanently. |
| `COMPLETED` | `COMPLETED` | **Yes** | Allowed for **7 days** post-booking completion, then archived. |

## 2. Block Restrictions

If user A blocks user B (or B blocks A):
- Messages are rejected immediately.
- Real-time Socket.io transmissions are discarded.
- Database records of blocks are stored in the `BlockedUsers` table.

## 3. Administrative Override

- Administrative actions can set rooms to `INACTIVE` or archive chat logs at any time.
