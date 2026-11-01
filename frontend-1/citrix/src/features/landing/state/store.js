/**
 * CITRIX Landing Page State
 * Lightweight store for 3D campus twin interaction.
 */

import { BUILDINGS, ROOMS } from './dataset.js';

class Store {
  constructor() {
    this.subscribers = new Set();
    this.selectedBuildingId = 'academic_a';
    this.selectedFloor = 1;
    this.selectedRoomId = 'A-104';
    this.viewMode3D = true;
  }

  subscribe(listener) {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  }

  notify() {
    this.subscribers.forEach(fn => fn(this));
  }

  selectBuilding(buildingId) {
    this.selectedBuildingId = buildingId;
    this.selectedFloor = 1;
    const firstRoom = ROOMS.find(r => r.buildingId === buildingId);
    this.selectedRoomId = firstRoom ? firstRoom.id : null;
    this.notify();
  }

  selectFloor(floorNum) {
    this.selectedFloor = floorNum;
    this.notify();
  }
}

export const store = new Store();
