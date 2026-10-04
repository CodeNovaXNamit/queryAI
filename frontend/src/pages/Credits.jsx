import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { RELEASE_TITLE } from '../config/release.js';

const MODULES = [
  { name: 'System Architecture', desc: 'Monorepo design and deployment topology' },
  { name: 'Backend & APIs', desc: 'Queue engine and management services' },
  { name: 'Realtime & Cloud', desc: 'Firebase database and security rules' },
  { name: 'Frontend', desc: 'Live customer, staff, and admin dashboards' },
  { name: 'Analytics & ML', desc: 'Predictive wait-time and queue-load models' },
  { name: 'Testing & Delivery', desc: 'Automated tests and deployment workflows' },
];

function fireConfetti() {
  const end = Date.now() + 600;
  const colors = ['#E2603F', '#1A1A1A', '#F7F3EC'];
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export default function Credits() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(fireConfetti, 350);
    return () => clearTimeout(timer);
  }, []);

  const handleThanks = () => {
    setCount(value => value + 1);
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 }, colors: ['#E2603F', '#1A1A1A', '#F7F3EC'] });
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="label mb-3">QueueLess · About</div>
      <h1 className="font-display text-5xl sm:text-7xl tracking-tightest leading-[0.92]">
        Built for simpler<br />
        <span className="text-accent">queue management</span>
      </h1>
      <p className="mt-5 text-graphite max-w-xl">
        QueueLess is a cloud-native smart token and queue management system for
        customers, staff, and administrators.
      </p>

      <div className="mt-10 border border-rule bg-cream p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="w-20 h-20 shrink-0 bg-ink text-paper font-display text-4xl flex items-center justify-center tracking-tightest">QL</div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-3xl">QueueLess</div>
            <div className="text-sm text-graphite mt-1">Digital queue operations</div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 border border-rule bg-paper">Realtime queues</span>
              <span className="px-2 py-1 border border-rule bg-paper">Analytics</span>
              <span className="px-2 py-1 border border-rule bg-paper">Role-based access</span>
              <span className="px-2 py-1 border border-rule bg-paper">Predictive insights</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <button onClick={handleThanks} className="btn-primary">🎉 Send a thank-you</button>
        {count > 0 && <span className="text-sm text-graphite">{count === 1 ? 'Thanks! 🎉' : `${count} thank-yous and counting`}</span>}
      </div>

      <h2 className="mt-14 font-display text-2xl tracking-tightest">What went into it</h2>
      <div className="mt-5 grid gap-px bg-rule sm:grid-cols-2">
        {MODULES.map(module => (
          <div key={module.name} className="bg-paper p-5 hover:bg-cream transition-colors">
            <div className="font-medium">{module.name}</div>
            <div className="text-sm text-graphite mt-1">{module.desc}</div>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-display text-2xl tracking-tightest">Languages</h2>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {['JavaScript', 'Python', 'HTML5', 'CSS3'].map(language => <span key={language} className="px-3 py-1.5 border border-rule bg-cream">{language}</span>)}
      </div>

      <h2 className="mt-10 font-display text-2xl tracking-tightest">Frameworks & Tools</h2>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {['React', 'Vite', 'Tailwind CSS', 'Node.js', 'Express', 'Firebase', 'MongoDB', 'scikit-learn', 'pandas'].map(tool => <span key={tool} className="px-3 py-1.5 border border-rule bg-cream">{tool}</span>)}
      </div>

      <div className="mt-14 pt-8 border-t border-rule flex items-center justify-between text-sm">
        <span className="text-graphite font-mono">{RELEASE_TITLE}</span>
        <Link to="/" className="btn-secondary text-sm">← Back to home</Link>
      </div>
    </div>
  );
}
