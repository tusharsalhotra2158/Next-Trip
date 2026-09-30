import { redirect } from 'next/navigation';

// Unknown paths go to the search page.
export default function CatchAll() {
  redirect('/travel/search');
}
