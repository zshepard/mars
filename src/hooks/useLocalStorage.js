// src/hooks/useLocalStorage.js
// Provides localStorage-based CRUD that mirrors Firestore API for offline/guest mode
import { useState, useEffect, useCallback } from 'react';

function getStored(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStored(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * useLocalCollection — localStorage equivalent of a Firestore collection listener
 * @param {string} key - localStorage key (e.g. 'mars-alarms')
 * @param {Array} defaultData - default data if nothing stored
 */
export function useLocalCollection(key, defaultData = []) {
  const [items, setItems] = useState(() => getStored(key, defaultData));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStored(key, items);
  }, [key, items]);

  const addItem = useCallback((data) => {
    const newItem = {
      ...data,
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => [...prev, newItem]);
    return newItem;
  }, []);

  const updateItem = useCallback((id, data) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...data, updatedAt: new Date().toISOString() } : item))
    );
  }, []);

  const deleteItem = useCallback((id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const replaceAll = useCallback((newItems) => {
    setItems(newItems);
  }, []);

  return { items, loading, addItem, updateItem, deleteItem, replaceAll };
}

/**
 * useLocalDoc — localStorage equivalent of a single Firestore document
 * @param {string} key - localStorage key
 * @param {Object} defaultData - default document data
 */
export function useLocalDoc(key, defaultData = {}) {
  const [data, setData] = useState(() => getStored(key, defaultData));

  useEffect(() => {
    setStored(key, data);
  }, [key, data]);

  const update = useCallback((partial) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  return { data, update };
}
