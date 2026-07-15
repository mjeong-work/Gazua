import { Link } from 'react-router';

export default function Footer() {
  return (
    <div className="mt-8 pt-4 border-t border-gray-100">
      <p className="text-[10px] text-gray-400 text-center leading-relaxed">
        All content on Gazua is user-generated and for educational purposes only. Not investment advice.
        Gazua does not endorse or guarantee any content.{' '}
        <Link to="/terms" className="underline hover:text-gray-500 transition-colors">Terms</Link>
        {' · '}
        <Link to="/privacy" className="underline hover:text-gray-500 transition-colors">Privacy</Link>
      </p>
    </div>
  );
}
