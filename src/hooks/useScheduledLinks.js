// src/hooks/useScheduledLinks.js
import { useState, useEffect } from 'react';
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

  // Firestore mode
  useEffect(() => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'users', uid, 'scheduledLinks'),
      orderBy('time', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLinks(data);
      setLoading(false);

      // Re-register all enabled links with the service worker
      data.forEach((link) => {
        if (link.enabled) {
          scheduleLink({
            link_id: link.id,
            time: link.time,
            days: link.days,
            url: link.url,
            device: link.device,
          });
        } else {
          cancelLink(link.id);
        }
      });
    });
    return unsub;
  }, [uid, isGuest]);

  // Re-register local links with SW on load (guest mode)
  useEffect(() => {
    if (!isGuest) return;
    local.items.forEach((link) => {
      if (link.enabled) {
        scheduleLink({
          link_id: link.id,
          time: link.time,
          days: link.days,
          url: link.url,
          device: link.device,
        });
      }
    });
  }, [isGuest, local.items]);

  const currentLinks = isGuest ? local.items : links;
  const isLoading = isGuest ? local.loading : loading;

  const addLink = (data) => {
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
      scheduleLink({
        link_id: newItem.id,
        time: linkData.time,
        days: linkData.days,
        url: linkData.url,
        device: linkData.device,
      });
      return newItem;
    }
    return addDoc(collection(db, 'users', uid, 'scheduledLinks'), {
      ...linkData,
      createdAt: serverTimestamp(),
    });
  };

  const updateLink = (id, data) => {
    if (isGuest) {
      local.updateItem(id, data);
      if (data.enabled === false) {
        cancelLink(id);
      }
      return;
    }
    return updateDoc(doc(db, 'users', uid, 'scheduledLinks', id), {
      ...data, updatedAt: serverTimestamp(),
    });
  };

  const deleteLink = async (id) => {
    cancelLink(id);
    if (isGuest) {
      local.deleteItem(id);
      return;
    }
    await deleteDoc(doc(db, 'users', uid, 'scheduledLinks', id));
  };

  return { links: currentLinks, loading: isLoading, addLink, updateLink, deleteLink };
}
