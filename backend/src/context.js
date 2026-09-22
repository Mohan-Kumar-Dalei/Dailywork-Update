/**
 * Har request ka apna user.
 *
 * 15 log ek hi server use karenge, isliye "kaun logged in hai" ko global
 * variable me nahi rakh sakte. AsyncLocalStorage har request ke liye alag
 * context rakhta hai, aur andar ka koi bhi function usse padh sakta hai --
 * har function me email pass karne ki zarurat nahi padti.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

const als = new AsyncLocalStorage();

export function runAs(email, fn) {
  return als.run({ email }, fn);
}

/** Abhi kaun logged in hai (null = koi nahi). */
export function currentUser() {
  return als.getStore()?.email || null;
}

export function requireUser() {
  const email = currentUser();
  if (!email) throw new Error('Please sign in with Google first.');
  return email;
}
