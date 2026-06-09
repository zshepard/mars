// src/hooks/useScheduledLinks.js
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { scheduleLink, cancelLink } from '../serviceWorkerRegistration';
import { useLocalCollection } from './useLocalStorage';

const GUEST_ID = 'mars-local-user';

export function useScheduledLinks(uid) {
  const isGuest = !uid || uid === GUEST_ID;
  const local = useLocalCollection('mars-scheduled-links', []);
  const [links, setLinks]     = useState([]);
  const [loading, setLoading] = useState(true);

  // Always-fresh ref to avoid stale closure in updateLink (mirrors Bug #2 fix in useAlarms)
  const linksRef = useRef(links);
  useEffect(() => { linksRef.current = links; }, [links]);

  // Guard against re-registering guest links on every render
  const guestRegistered = useRef(false);

  // ── Firestore mode ──────────────────────────────────────────────
  useEffect(() => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    guestRegistered.current = false;
    const q = query(
      collection(db, 'users', uid, 'scheduledLinks'),
      orderBy('time', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLinks(data);
      setLoading(false);
      data.forEach((link) => {
        if (link.enabled !== false) {
          scheduleLink({ link_id: link.id, time: link.time, days: link.days, url: link.url, device: link.device });
        } else {
          cancelLink(link.id);
        }
      });
    });
    return unsub;
  }, [uid, isGuest]);

  // ── BUG FIX #3: Register guest links only once on mount ────────
  useEffect(() => {
    if (!isGuest) return;
    if (guestRegistered.current) return;
    guestRegistered.current = true;
    local.items.forEach((link) => {
      if (link.enabled !== false) {
        scheduleLink({ link_id: link.id, time: link.time, days: link.days, url: link.url, device: link.device });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest]);

  const currentLinks = isGuest ? local.items : links;
  const isLoading = isGuest ? local.loading : loading;

  const addLink = useCallback((data) => {
    const linkData = {
      label:   data.label || '',
      url:     data.url,
      time:    data.time,
      days:    data.days || ['Mon','Tue','Wed','Thu','Fri'],
      device:  data.device || 'phone',
      enabled: true,
    };
    if (isGuest) {
      const newItem = local.addItem(linkData);
      scheduleLink({ link_id: newItem.id, time: linkData.time, days: linkData.days, url: linkData.url, device: linkData.device });
      return newItem;
    }
    return addDoc(collection(db, 'users', uid, 'scheduledLinks'), {
      ...linkData,
      createdAt: serverTimestamp(),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, isGuest]);

  // ── BUG FIX #1: updateLink now re-schedules after any edit ─────
  const updateLink = useCallback((id, data) => {
    if (isGuest) {
      local.updateItem(id, data);
      if (data.enabled === false) {
        cancelLink(id);
      } else {
        // Re-schedule with merged data so new time/days/url take effect immediately
        const existing = local.items.find((l) => l.id === id);
        const merged = { ...existing, ...data };
        scheduleLink({ link_id: id, time: merged.time, days: merged.days, url: merged.url, device: merged.device });
      }
      return;
    }
    // Firestore mode — write first, then re-schedule using fresh ref
    const existing = linksRef.current.find((l) => l.id === id);
    const merged = { ...existing, ...data };
    if (data.enabled === false) {
      cancelLink(id);
    } else {
      scheduleLink({ link_id: id, time: merged.time, days: merged.days, url: merged.url, device: merged.device });
    }
    return updateDoc(doc(db, 'users', uid, 'scheduledLinks', id), {
      ...data, updatedAt: serverTimestamp(),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, isGuest]);

  const deleteLink = useCallback(async (id) => {
    cancelLink(id);
    if (isGuest) {
      local.deleteItem(id);
      return;
    }
    await deleteDoc(doc(db, 'users', uid, 'scheduledLinks', id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, isGuest]);

  return { links: currentLinks, loading: isLoading, addLink, updateLink, deleteLink };
}
