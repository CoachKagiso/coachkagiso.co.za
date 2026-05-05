'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu } from 'lucide-react';
import { motion, useScroll, useMotionValueEvent } from 'motion/react';

const navItems = ['Home', 'About', 'Work With Me', 'Insights', 'Resources', 'Contact'];

function getHref(item: string) {
  if (item === 'Contact') return '/contact';
  if (item === 'Home') return '/';
  if (item === 'About') return '/about';
  if (item === 'Insights') return '/insights';
  if (item === 'Resources') return '/resources';
  if (item === 'Work With Me') return '/work-with-me';
  return `/#${item.toLowerCase().replace(/ /g, '-')}`;
}

const resourceLinks = [
  {
    label: 'Career tools',
    href: '/resources/tools',
    description: 'Diagnostics and guided assessments',
  },
  {
    label: 'Free downloads',
    href: '/resources/downloads',
    description: 'PDFs, checklists, and prompts',
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  function isActive(item: string) {
    const href = getHref(item);
    if (item === 'Home') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  return (
    <motion.header
      animate={{
        backgroundColor: isScrolled ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0)',
        borderColor: isScrolled ? 'rgba(205, 198, 195, 0.5)' : 'rgba(205, 198, 195, 0)',
        boxShadow: isScrolled ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none'
      }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 w-full z-50 backdrop-blur-md border-b border-transparent"
    >
      <nav className="max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          <Link href="/" className="font-sans font-semibold tracking-[0.18em] text-[15px] text-[#142334]">
            COACH KAGISO
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => (
              item === 'Resources' ? (
                <div key={item} className="group relative py-6">
                  <Link
                    href="/resources"
                    className={`relative inline-flex items-center gap-1.5 text-[13px] tracking-wide font-semibold transition-colors duration-300 hover:text-[#C9AD98] uppercase ${isActive(item) ? 'text-[#C9AD98]' : 'text-[#142334]'}`}
                  >
                    {item}
                    <ChevronDown className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-180" />
                    <span className={`absolute -bottom-1.5 left-0 h-[1.5px] transition-all duration-300 ease-out ${isActive(item) ? 'w-full bg-[#C9AD98]' : 'w-0 bg-[#C9AD98] group-hover:w-full'}`}></span>
                  </Link>

                  <div className="pointer-events-none absolute left-1/2 top-full w-[310px] -translate-x-1/2 translate-y-2 border border-[#D8C8BB] bg-white/95 p-3 opacity-0 shadow-[0_24px_70px_rgba(20,35,52,0.12)] backdrop-blur-md transition duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    {resourceLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="block border-b border-[#142334]/10 px-4 py-4 last:border-b-0 hover:bg-[#F7F1EC] transition"
                      >
                        <span className="block text-[12px] uppercase tracking-[0.18em] font-semibold text-[#142334]">
                          {link.label}
                        </span>
                        <span className="mt-1 block text-[13px] leading-relaxed text-[#142334]/62">
                          {link.description}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  key={item}
                  href={getHref(item)}
                  className={`group relative text-[13px] tracking-wide font-semibold transition-colors duration-300 hover:text-[#C9AD98] uppercase ${isActive(item) ? 'text-[#C9AD98]' : 'text-[#142334]'}`}
                >
                  {item}
                  <span className={`absolute -bottom-1.5 left-0 h-[1.5px] bg-[#C9AD98] transition-all duration-300 ease-out ${isActive(item) ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                </Link>
              )
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link href="/book/discovery" className="hidden sm:inline-flex bg-[#C9AD98] border border-[#C9AD98] text-[#142334] text-[13px] tracking-widest font-semibold uppercase px-6 py-2.5 rounded-full hover:bg-transparent hover:text-[#C9AD98] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 shadow-sm">
              Book a Discovery Call
            </Link>
            <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden p-2">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
        {isOpen && (
          <div className="lg:hidden pb-6 border-t border-[#CDC6C3]/50 mt-2">
            <div className="flex flex-col gap-4 pt-4">
              {navItems.map((item) => (
                <div key={item}>
                  <Link
                    href={getHref(item)}
                    className="block text-[14px] uppercase tracking-wider font-semibold text-[#142334]"
                    onClick={() => setIsOpen(false)}
                  >
                    {item}
                  </Link>
                  {item === 'Resources' && (
                    <div className="mt-3 ml-4 flex flex-col gap-3 border-l border-[#D8C8BB] pl-4">
                      {resourceLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="text-[13px] uppercase tracking-[0.16em] font-semibold text-[#142334]/70"
                          onClick={() => setIsOpen(false)}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>
    </motion.header>
  );
}
