import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  link?: string
) {
  try {
    await addDoc(collection(db, 'notifications', userId, 'items'), {
      type, title, message, link: link || null, read: false,
      createdAt: serverTimestamp(),
    })
  } catch (e) {
    console.error('Failed to create notification', e)
  }
}
