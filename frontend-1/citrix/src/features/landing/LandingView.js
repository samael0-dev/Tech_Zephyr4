/**
 * CITRIX — CampusOS Intelligence
 * Premium Editorial Paginated Landing Experience
 * Designed and engineered by Team Delta X.
 *
 * 3-Slide Horizontal Sliding Deck:
 * - 00: Cinematic Intro Preloader (learnwithzero style)
 * - 01: Platform & 3D Spatial Twin Hero
 * - 02: Institutional Architecture & Impact
 * - 03: CP-SAT Decision Pipeline
 */

import { BUILDINGS, ROOMS } from './state/dataset.js';
import { store } from './state/store.js';
import { CampusScene } from './campus3d/CampusScene.js';

export function renderLandingView(container) {
  // Local state for interactive landing components
  let currentHeroMode = 'aerial'; // 'aerial' | 'threejs'
  let selectedHeroBuilding = BUILDINGS[0]; // Academic Block A
  let threeSceneInstance = null;
  let currentDeckPage = 0;
  const totalPages = 3;
  const pageNames = [
    '01 · Platform',
    '02 · Impact',
    '03 · Pipeline',
  ];

  // Render main container structure
  container.innerHTML = `
    <div id="citrix-landing-root" class="w-full min-h-screen bg-[#F7F8F6] text-[#101110] relative selection:bg-[#B8F36B] selection:text-[#101110] overflow-x-hidden">

      <style>
        html {
          scroll-behavior: smooth;
        }
        .citrix-landing-section {
          transition: opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }
        .citrix-landing-section.citrix-section-hidden {
          opacity: 0.15;
          transform: translateY(36px);
        }
        .citrix-landing-section.citrix-section-visible {
          opacity: 1;
          transform: translateY(0);
        }
      </style>

      <!-- ==========================================
           INTRO PRELOADER — learnwithzero style
           Full-screen cinematic entrance animation.
           ========================================== -->
      <div id="citrix-intro" aria-hidden="true" style="
        position:fixed;inset:0;z-index:9999;
        display:flex;flex-direction:column;
        pointer-events:none;
      ">
        <!-- Upper Panel -->
        <div id="intro-panel-top" style="
          flex:1;background:#080A09;
          display:flex;flex-direction:column;
          justify-content:flex-end;
          padding:0 clamp(24px,6vw,80px) 40px;
          position:relative;overflow:hidden;
          transition:transform 0.85s cubic-bezier(0.76,0,0.24,1);
        ">
          <!-- Subtle grid / noise texture overlay -->
          <div style="
            position:absolute;inset:0;
            background-image:radial-gradient(circle at 20% 80%, rgba(184,243,107,0.04) 0%, transparent 60%),
              radial-gradient(circle at 80% 20%, rgba(184,243,107,0.03) 0%, transparent 50%);
            pointer-events:none;
          "></div>

          <!-- Brand Symbol -->
          <div id="intro-symbol" style="
            position:absolute;top:clamp(24px,5vw,48px);left:clamp(24px,6vw,80px);
            display:flex;align-items:center;gap:10px;
            opacity:0;transform:translateY(6px);
            transition:opacity 0.6s ease,transform 0.6s ease;
          ">
            <div style="width:28px;height:28px;border-radius:8px;background:#101110;border:1px solid #1F2420;display:flex;align-items:center;justify-content:center;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B8F36B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
              </svg>
            </div>
            <span style="font-family:'Inter',sans-serif;font-size:12px;font-weight:700;color:#777D78;letter-spacing:0.15em;text-transform:uppercase;">CITRIX · CampusOS</span>
          </div>

          <!-- Main Intro Heading -->
          <div style="overflow:hidden;margin-bottom:16px;">
            <div id="intro-line1" style="
              font-family:'Inter',sans-serif;
              font-size:clamp(52px,11vw,140px);
              font-weight:900;
              letter-spacing:-0.04em;
              line-height:0.9;
              color:#F7F8F6;
              clip-path:inset(0 0 110% 0);
              transition:clip-path 0.9s cubic-bezier(0.16,1,0.3,1);
            ">CITRIX</div>
          </div>
          <div style="overflow:hidden;margin-bottom:36px;">
            <div id="intro-line2" style="
              font-family:'Inter',sans-serif;
              font-size:clamp(52px,11vw,140px);
              font-weight:900;
              letter-spacing:-0.04em;
              line-height:0.9;
              color:#B8F36B;
              clip-path:inset(0 0 110% 0);
              transition:clip-path 0.9s cubic-bezier(0.16,1,0.3,1) 0.12s;
            ">CampusOS</div>
          </div>

          <!-- Tag words -->
          <div id="intro-tagline" style="
            display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px;
          ">
            ${['One','Campus.','One','Intelligent','System.'].map((word,i) => `
              <div style="overflow:hidden;display:inline-block;">
                <span class="intro-tag-word" data-delay="${0.04*i}" style="
                  display:inline-block;
                  font-family:'Inter',sans-serif;
                  font-size:clamp(13px,1.8vw,18px);
                  font-weight:500;
                  color:#9AA19C;
                  letter-spacing:-0.01em;
                  transform:translateY(100%);
                  transition:transform 0.7s cubic-bezier(0.16,1,0.3,1) ${0.04*i}s;
                ">${word}</span>
              </div>
            `).join('')}
          </div>

          <!-- Progress bar + counter row -->
          <div style="display:flex;align-items:center;gap:16px;padding-top:40px;">
            <div style="flex:1;height:1px;background:#1F2420;overflow:hidden;border-radius:1px;position:relative;">
              <div id="intro-progress-bar" style="
                position:absolute;inset:0;
                background:linear-gradient(90deg,#B8F36B 0%,#A6E854 100%);
                transform:scaleX(0);transform-origin:left;
                transition:transform 2.2s cubic-bezier(0.4,0,0.2,1);
                border-radius:1px;
              "></div>
            </div>
            <div id="intro-counter" style="
              font-family:'JetBrains Mono',monospace;
              font-size:11px;font-weight:600;color:#777D78;
              letter-spacing:0.08em;min-width:36px;text-align:right;
            ">0%</div>
          </div>

          <div style="
            position:absolute;bottom:0;left:0;right:0;height:1px;
            background:linear-gradient(90deg,transparent 0%,#1F2420 20%,#1F2420 80%,transparent 100%);
          "></div>
        </div>

        <!-- Lower Panel -->
        <div id="intro-panel-bottom" style="
          height:1px;background:#B8F36B;
          transition:transform 0.85s cubic-bezier(0.76,0,0.24,1);
        "></div>
      </div>

      <!-- ==========================================
           PERSISTENT FLOATING NAVIGATION BAR
           ========================================== -->
      <nav id="citrix-navbar" class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 sm:px-6 lg:px-10 py-4 pointer-events-none">
        <div class="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto bg-white/90 backdrop-blur-xl border border-[#E5E8E3] rounded-2xl px-5 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all">
          
          <!-- Left: CITRIX Brand Symbol & Wordmark -->
          <button onclick="window.__citrixGoToPage(0)" class="flex items-center gap-3 group focus:outline-none text-left">
            <div class="relative w-8 h-8 rounded-xl bg-[#080A09] flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm">
              <svg class="w-4 h-4 text-[#B8F36B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
              <div class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#B8F36B]"></div>
            </div>
            <div class="flex flex-col">
              <div class="flex items-center gap-2">
                <span class="text-base font-black tracking-[-0.03em] text-[#101110] font-sans">CITRIX</span>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase bg-[#F0F2EE] text-[#777D78] border border-[#E5E8E3]">OS</span>
              </div>
              <span class="text-[10px] text-[#777D78] tracking-tight font-medium hidden sm:block">CampusOS Intelligence</span>
            </div>
          </button>

          <!-- Center: 3-Slide Stepper Navigation Links -->
          <div class="hidden md:flex items-center gap-1.5 text-xs font-semibold p-1 bg-[#F0F2EE] rounded-xl border border-[#E5E8E3]">
            <button id="nav-pill-0" onclick="window.__citrixGoToPage(0)" class="nav-page-btn px-3 py-1.5 rounded-lg transition-all bg-[#080A09] text-white shadow-sm">
              01 Platform
            </button>
            <button id="nav-pill-1" onclick="window.__citrixGoToPage(1)" class="nav-page-btn px-3 py-1.5 rounded-lg transition-all text-[#777D78] hover:text-[#101110]">
              02 Impact
            </button>
            <button id="nav-pill-2" onclick="window.__citrixGoToPage(2)" class="nav-page-btn px-3 py-1.5 rounded-lg transition-all text-[#777D78] hover:text-[#101110] flex items-center gap-1.5">
              <span>03 Pipeline</span>
              <span class="px-1 py-0.2 rounded text-[9px] bg-[#B8F36B] text-[#101110] font-mono font-bold">CP-SAT</span>
            </button>
          </div>

          <!-- Right: Explore Workspace CTA & Mobile Menu Toggle Button -->
          <div class="flex items-center gap-2 sm:gap-3">
            <button id="nav-explore-btn" onclick="window.__citrixOnEnterWorkspace ? window.__citrixOnEnterWorkspace() : (window.location.href = '/login')"
              class="group relative inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#080A09] text-white hover:bg-[#151917] transition-all text-xs font-semibold shadow-sm hover:shadow-md cursor-pointer">
              <span>Explore Workspace</span>
              <svg class="w-3.5 h-3.5 text-[#B8F36B] transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </button>
            <button onclick="window.__citrixToggleMobileMenu()" class="md:hidden p-2 rounded-xl text-[#101110] hover:bg-[#F0F2EE] transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/>
              </svg>
            </button>
          </div>

        </div>

        <!-- Mobile Navigation Drawer -->
        <div id="mobile-nav-drawer" class="hidden md:hidden mt-2 max-w-7xl mx-auto bg-white/95 backdrop-blur-xl border border-[#E5E8E3] rounded-2xl p-4 shadow-elevation pointer-events-auto">
          <div class="flex flex-col gap-2 text-xs font-medium text-[#777D78]">
            <button onclick="window.__citrixGoToPage(0); window.__citrixToggleMobileMenu();" class="text-left px-3 py-2 rounded-lg hover:bg-[#F0F2EE] text-[#101110] font-bold">01 · Platform & Spatial Twin</button>
            <button onclick="window.__citrixGoToPage(1); window.__citrixToggleMobileMenu();" class="text-left px-3 py-2 rounded-lg hover:bg-[#F0F2EE] text-[#101110] font-bold">02 · Institutional Impact</button>
            <button onclick="window.__citrixGoToPage(2); window.__citrixToggleMobileMenu();" class="text-left px-3 py-2 rounded-lg hover:bg-[#F0F2EE] text-[#101110] font-bold flex items-center justify-between">
              <span>03 · CP-SAT Decision Pipeline</span>
              <span class="px-1.5 py-0.5 rounded text-[10px] bg-[#B8F36B] text-[#101110] font-bold">NEW</span>
            </button>
          </div>
        </div>
      </nav>

      <!-- ==========================================
           MAIN PRESENTATION DECK (ALL 3 SECTIONS MERGED IN ONE PAGE)
           ========================================== -->
      <main id="citrix-deck-viewport" class="relative w-full pt-24 pb-28 space-y-24 sm:space-y-36">

        <!-- ==============================================================
             PAGE 0: CINEMATIC 3D CAMPUS HERO & SPATIAL TWIN
             ============================================================== -->
        <section id="deck-page-0" class="citrix-landing-section w-full scroll-mt-24 transition-all duration-700 ease-out citrix-section-visible" data-page="0">
          <div class="px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto">
            
            <!-- Hero Editorial Typography Header -->
            <div class="max-w-4xl mb-8 sm:mb-10">
              <!-- Eyebrow Pill -->
              <div class="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white border border-[#E5E8E3] shadow-subtle mb-4 sm:mb-6">
                <span class="w-2 h-2 rounded-full bg-[#B8F36B] shadow-[0_0_8px_#B8F36B] animate-pulse"></span>
                <span class="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-[#101110]">
                  INTELLIGENT CAMPUS OPERATING SYSTEM
                </span>
              </div>

              <!-- Main Confident Headline -->
              <h1 class="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-[-0.04em] leading-[0.94] text-[#101110] mb-5">
                One Campus.<br/>
                <span class="text-[#777D78]">One Intelligent System.</span>
              </h1>

              <!-- Supporting Text -->
              <p class="text-base sm:text-lg md:text-xl text-[#777D78] font-normal leading-relaxed max-w-2xl mb-7">
                Bringing academic scheduling, campus operations and intelligent decision-making together in one unified platform.
              </p>

              <!-- Action CTAs & Navigation Prompts -->
              <div class="flex flex-wrap items-center gap-3 sm:gap-4">
                <button onclick="window.__citrixGoToPage(1)"
                  class="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#B8F36B] text-[#101110] hover:bg-[#A6E854] font-bold text-sm tracking-tight transition-all shadow-glow-sm hover:shadow-glow-green hover:-translate-y-0.5">
                  <span>Explore CITRIX</span>
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
                  </svg>
                </button>
                <button onclick="window.__citrixOnEnterWorkspace ? window.__citrixOnEnterWorkspace() : (window.location.href = '/login')"
                  class="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#080A09] text-white hover:bg-[#151917] border border-[#1F2420] font-bold text-sm tracking-tight transition-all hover:-translate-y-0.5 cursor-pointer">
                  <span>Explore Workspace</span>
                  <svg class="w-4 h-4 text-[#B8F36B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Campus Visual Viewport -->
            <div class="relative w-full h-[480px] sm:h-[580px] lg:h-[660px] rounded-3xl border border-[#E5E8E3] overflow-hidden shadow-elevation bg-[#080A09] group">
              
              <!-- Mode A: Aerial Spatial Twin -->
              <div id="hero-aerial-layer" class="absolute inset-0 w-full h-full transition-opacity duration-700 ${currentHeroMode === 'aerial' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'}">
                <img src="./assets/campus_aerial.jpg" alt="Chilika Institute of Technology Campus Digital Twin" 
                  class="w-full h-full object-cover object-center filter brightness-[0.92] contrast-[1.08] transition-transform duration-1000 group-hover:scale-[1.01]" />
                
                <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 600" preserveAspectRatio="none">
                  <path d="M 280 240 Q 380 320 620 370" fill="none" stroke="#B8F36B" stroke-width="1.8" stroke-dasharray="6,6" class="animate-dash opacity-60" />
                  <path d="M 330 140 Q 480 220 540 310" fill="none" stroke="#B8F36B" stroke-width="1.5" stroke-dasharray="6,6" class="animate-dash opacity-50" />
                  <path d="M 540 310 Q 580 430 630 460" fill="none" stroke="#B8F36B" stroke-width="1.5" stroke-dasharray="6,6" class="animate-dash opacity-60" />
                  <circle cx="530" cy="310" r="130" fill="none" stroke="#B8F36B" stroke-width="1" stroke-dasharray="8,8" class="animate-dash opacity-30" />
                </svg>

                <!-- Interactive Building Radar Nodes -->
                <div onclick="window.__citrixHeroSelectBuilding('acad_a')" 
                  class="absolute left-[26%] top-[38%] -translate-x-1/2 -translate-y-1/2 cursor-pointer group/node z-20">
                  <div class="relative flex items-center justify-center">
                    <span class="absolute w-8 h-8 rounded-full bg-[#B8F36B]/25 animate-radar-pulse"></span>
                    <span class="w-3.5 h-3.5 rounded-full bg-[#B8F36B] border-2 border-[#080A09] shadow-[0_0_12px_#B8F36B]"></span>
                  </div>
                  <div class="absolute left-6 top-1/2 -translate-y-1/2 bg-[#080A09]/90 backdrop-blur-md border border-[#B8F36B]/40 rounded-xl px-3 py-1.5 shadow-2xl min-w-[170px] pointer-events-auto transition-transform group-hover/node:scale-105">
                    <div class="text-[10px] font-mono text-[#B8F36B] font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>Academic Block A</span>
                      <span class="w-1.5 h-1.5 rounded-full bg-[#B8F36B] animate-pulse"></span>
                    </div>
                    <div class="text-xs font-semibold text-white">12 sessions active</div>
                    <div class="text-[10px] text-[#9AA19C]">LT-1 to LT-4 · 92% Occ</div>
                  </div>
                </div>

                <div onclick="window.__citrixHeroSelectBuilding('acad_b')" 
                  class="absolute left-[33%] top-[20%] -translate-x-1/2 -translate-y-1/2 cursor-pointer group/node z-20">
                  <div class="relative flex items-center justify-center">
                    <span class="absolute w-7 h-7 rounded-full bg-[#B8F36B]/25 animate-radar-pulse"></span>
                    <span class="w-3 h-3 rounded-full bg-[#B8F36B] border-2 border-[#080A09]"></span>
                  </div>
                  <div class="absolute left-5 top-1/2 -translate-y-1/2 bg-[#080A09]/90 backdrop-blur-md border border-[#1F2420] group-hover/node:border-[#B8F36B]/40 rounded-xl px-3 py-1.5 shadow-2xl min-w-[160px] pointer-events-auto">
                    <div class="text-[10px] font-mono text-[#B8F36B] font-bold">Academic Block B</div>
                    <div class="text-xs font-semibold text-white">8 sessions active</div>
                    <div class="text-[10px] text-[#9AA19C]">Seminar Halls · 74% Occ</div>
                  </div>
                </div>

                <div onclick="window.__citrixHeroSelectBuilding('sci_cmplx')" 
                  class="absolute left-[66%] top-[40%] -translate-x-1/2 -translate-y-1/2 cursor-pointer group/node z-20">
                  <div class="relative flex items-center justify-center">
                    <span class="absolute w-8 h-8 rounded-full bg-[#B8F36B]/25 animate-radar-pulse"></span>
                    <span class="w-3.5 h-3.5 rounded-full bg-[#B8F36B] border-2 border-[#080A09] shadow-[0_0_10px_#B8F36B]"></span>
                  </div>
                  <div class="absolute right-6 top-1/2 -translate-y-1/2 bg-[#080A09]/90 backdrop-blur-md border border-[#B8F36B]/40 rounded-xl px-3 py-1.5 shadow-2xl min-w-[170px] pointer-events-auto text-right">
                    <div class="text-[10px] font-mono text-[#B8F36B] font-bold">Science Complex</div>
                    <div class="text-xs font-semibold text-white">6 research sessions</div>
                    <div class="text-[10px] text-[#9AA19C]">Lab-1 3hr Block Active</div>
                  </div>
                </div>

                <div onclick="window.__citrixHeroSelectBuilding('oat')" 
                  class="absolute left-[54%] top-[48%] -translate-x-1/2 -translate-y-1/2 cursor-pointer group/node z-20">
                  <div class="relative flex items-center justify-center">
                    <span class="w-3.5 h-3.5 rounded-full bg-[#B8F36B] border-2 border-[#080A09]"></span>
                  </div>
                  <div class="absolute left-6 top-1/2 -translate-y-1/2 bg-[#080A09]/90 backdrop-blur-md border border-[#1F2420] rounded-xl px-3 py-1.5 shadow-2xl min-w-[160px] pointer-events-auto">
                    <div class="text-[10px] font-mono text-[#B8F36B] font-bold">Central Plaza & OAT</div>
                    <div class="text-xs font-semibold text-white">Open Air Amphitheatre</div>
                    <div class="text-[10px] text-[#9AA19C]">Robotics Club 15:00</div>
                  </div>
                </div>

                <div onclick="window.__citrixHeroSelectBuilding('audi')" 
                  class="absolute left-[62%] top-[60%] -translate-x-1/2 -translate-y-1/2 cursor-pointer group/node z-20">
                  <div class="relative flex items-center justify-center">
                    <span class="w-3 h-3 rounded-full bg-[#B8F36B] border-2 border-[#080A09]"></span>
                  </div>
                  <div class="absolute left-5 top-1/2 -translate-y-1/2 bg-[#080A09]/90 backdrop-blur-md border border-[#1F2420] rounded-xl px-3 py-1.5 shadow-2xl min-w-[150px] pointer-events-auto">
                    <div class="text-[10px] font-mono text-[#B8F36B] font-bold">Auditorium</div>
                    <div class="text-xs font-semibold text-white">AUD-Main (350)</div>
                    <div class="text-[10px] text-[#9AA19C]">Approved Booking</div>
                  </div>
                </div>

                <div onclick="window.__citrixHeroSelectBuilding('library')" 
                  class="absolute left-[44%] top-[58%] -translate-x-1/2 -translate-y-1/2 cursor-pointer group/node z-20">
                  <div class="relative flex items-center justify-center">
                    <span class="w-3 h-3 rounded-full bg-[#B8F36B] border-2 border-[#080A09]"></span>
                  </div>
                  <div class="absolute right-5 top-1/2 -translate-y-1/2 bg-[#080A09]/90 backdrop-blur-md border border-[#1F2420] rounded-xl px-3 py-1.5 shadow-2xl min-w-[150px] pointer-events-auto text-right">
                    <div class="text-[10px] font-mono text-[#B8F36B] font-bold">Central Library</div>
                    <div class="text-xs font-semibold text-white">4 study sessions</div>
                    <div class="text-[10px] text-[#9AA19C]">CR1 & CR2 Available</div>
                  </div>
                </div>
              </div>

              <!-- Mode B: Three.js WebGL 3D Interactive Canvas -->
              <div id="hero-threejs-container" class="absolute inset-0 w-full h-full transition-opacity duration-700 ${currentHeroMode === 'threejs' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'}">
              </div>

              <!-- Floating HUD Top Overlay -->
              <div class="absolute top-4 left-4 right-4 z-30 flex flex-wrap items-center justify-between pointer-events-none gap-3">
                <div class="bg-[#080A09]/85 backdrop-blur-xl border border-[#1F2420] rounded-2xl px-4 py-2.5 shadow-2xl pointer-events-auto flex items-center gap-4 text-xs font-mono">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-[#B8F36B] shadow-[0_0_8px_#B8F36B] animate-pulse"></span>
                    <span class="text-white font-bold">CAMPUS OS</span>
                  </div>
                  <div class="h-3 w-px bg-[#1F2420]"></div>
                  <div class="text-[#9AA19C]">27 Venues Verified</div>
                  <div class="h-3 w-px bg-[#1F2420] hidden sm:block"></div>
                  <div class="text-[#9AA19C] hidden sm:block">189 Curricular Sessions</div>
                  <div class="h-3 w-px bg-[#1F2420] hidden md:block"></div>
                  <div class="text-[#B8F36B] font-bold hidden md:block">0 Clashes</div>
                </div>

                <div class="bg-[#080A09]/85 backdrop-blur-xl border border-[#1F2420] rounded-2xl p-1 shadow-2xl pointer-events-auto flex items-center gap-1 text-xs">
                  <button id="btn-mode-aerial" onclick="window.__citrixSetHeroMode('aerial')"
                    class="px-3 py-1.5 rounded-xl font-medium transition-all ${currentHeroMode === 'aerial' ? 'bg-[#1F2420] text-[#B8F36B] font-bold shadow-sm' : 'text-[#9AA19C] hover:text-white'}">
                    Aerial Spatial Matrix
                  </button>
                  <button id="btn-mode-threejs" onclick="window.__citrixSetHeroMode('threejs')"
                    class="px-3 py-1.5 rounded-xl font-medium transition-all ${currentHeroMode === 'threejs' ? 'bg-[#1F2420] text-[#B8F36B] font-bold shadow-sm' : 'text-[#9AA19C] hover:text-white'}">
                    Interactive 3D Canvas
                  </button>
                </div>
              </div>

              <!-- Floating HUD Bottom Overlay -->
              <div class="absolute bottom-4 left-4 right-4 z-30 flex flex-wrap items-end justify-between pointer-events-none gap-3">
                <div id="hero-building-inspector" class="bg-[#080A09]/90 backdrop-blur-xl border border-[#1F2420] rounded-2xl p-4 shadow-2xl pointer-events-auto max-w-sm transition-all">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-[10px] font-mono font-bold text-[#B8F36B] uppercase tracking-wider">Spatial Focus</span>
                    <span class="text-[10px] font-mono text-[#9AA19C]">CIT Spatial Model</span>
                  </div>
                  <div id="inspector-building-name" class="text-sm font-bold text-white mb-0.5">Academic Block A</div>
                  <div id="inspector-building-desc" class="text-xs text-[#9AA19C] mb-3">6 Lecture Theatres, 8 Department Classrooms, Step-free accessible</div>
                  <div class="flex items-center gap-2">
                    <div class="px-3 py-1.5 rounded-lg bg-[#B8F36B]/20 border border-[#B8F36B]/40 text-[#B8F36B] text-[11px] font-mono font-bold flex items-center gap-1.5">
                      <span class="w-1.5 h-1.5 rounded-full bg-[#B8F36B] animate-pulse"></span>
                      <span>Verified Active</span>
                    </div>
                    <div class="px-3 py-1.5 rounded-lg bg-[#151917] border border-[#1F2420] text-[#9AA19C] text-[11px] font-mono">
                      <span>0 Clashes</span>
                    </div>
                  </div>
                </div>

                <div class="bg-[#080A09]/90 backdrop-blur-xl border border-[#1F2420] rounded-xl px-3.5 py-2 pointer-events-auto text-[11px] font-mono text-[#9AA19C] hidden sm:flex items-center gap-3">
                  <span class="text-white font-bold">Orbit Controls:</span>
                  <span>🖱 Click & Drag to Rotate</span>
                  <span class="text-[#1F2420]">|</span>
                  <span>📜 Scroll to Zoom</span>
                </div>
              </div>

            </div>

            <!-- In-Page Advance Prompt -->
            <div class="mt-8 pt-4 border-t border-[#E5E8E3] flex items-center justify-between text-xs text-[#777D78]">
              <span class="font-mono">Slide 01 of 03 · Spatial Foundation</span>
              <button onclick="window.__citrixGoToPage(1)" class="inline-flex items-center gap-2 font-bold text-[#101110] hover:text-[#7FB33C] transition-colors">
                <span>Continue to Platform Architecture & Impact ↓</span>
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>
              </button>
            </div>

          </div>
        </section>

        <!-- ==============================================================
             PAGE 1: INSTITUTIONAL ARCHITECTURE & IMPACT
             ============================================================== -->
        <section id="deck-page-1" class="citrix-landing-section w-full scroll-mt-24 transition-all duration-700 ease-out citrix-section-hidden" data-page="1">
          <div class="w-full bg-[#080A09] text-white py-14 sm:py-20 px-4 sm:px-6 lg:px-10 rounded-3xl border border-[#1F2420] max-w-7xl mx-auto relative overflow-hidden shadow-2xl">
            
            <div class="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#B8F36B]/5 rounded-full blur-[140px] pointer-events-none"></div>

            <div class="relative z-10 max-w-6xl mx-auto">
              <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#121614] border border-[#1F2420] text-[#B8F36B] text-[11px] font-mono font-semibold uppercase tracking-[0.2em] mb-6">
                02 · INSTITUTIONAL ARCHITECTURE & IMPACT
              </div>

              <h2 class="text-3xl sm:text-5xl md:text-6xl font-black tracking-[-0.03em] leading-[1.05] text-white max-w-4xl mb-6">
                A campus is more than buildings.<br/>
                <span class="text-[#9AA19C]">It's a system of interconnected decisions.</span>
              </h2>

              <p class="text-base sm:text-lg text-[#9AA19C] font-normal leading-relaxed max-w-3xl mb-12">
                Every semester, thousands of interdependent operational constraints collide: 189 curricular sessions, 40 specialized faculty, 27 physical venues, student cohort curricula, and institutional safety regulations. When managed in disconnected silos, schedule fragmentation and venue contention paralyze administration. CITRIX introduces the unified intelligence layer connecting campus operations into a single deterministic, conflict-free nervous system.
              </p>

              <!-- Telemetry Grid -->
              <div class="grid grid-cols-2 md:grid-cols-5 gap-3.5 sm:gap-4 mb-14">
                <div class="p-5 sm:p-6 rounded-2xl bg-[#121614] border border-[#1F2420] flex flex-col justify-between">
                  <span class="text-xs font-mono uppercase tracking-wider text-[#9AA19C]">Schedulable Venues</span>
                  <div class="mt-4">
                    <span class="text-3xl sm:text-4xl font-black text-white font-mono">27</span>
                    <p class="text-[11px] text-[#777D78] mt-1">LTs, Labs, Auditoriums, OAT</p>
                  </div>
                </div>

                <div class="p-5 sm:p-6 rounded-2xl bg-[#121614] border border-[#1F2420] flex flex-col justify-between">
                  <span class="text-xs font-mono uppercase tracking-wider text-[#9AA19C]">Curricular Sessions</span>
                  <div class="mt-4">
                    <span class="text-3xl sm:text-4xl font-black text-[#B8F36B] font-mono">189</span>
                    <p class="text-[11px] text-[#777D78] mt-1">162 lectures + 27 3h labs</p>
                  </div>
                </div>

                <div class="p-5 sm:p-6 rounded-2xl bg-[#121614] border border-[#1F2420] flex flex-col justify-between">
                  <span class="text-xs font-mono uppercase tracking-wider text-[#9AA19C]">Faculty Workload</span>
                  <div class="mt-4">
                    <span class="text-3xl sm:text-4xl font-black text-white font-mono">40</span>
                    <p class="text-[11px] text-[#777D78] mt-1">Balanced max-hour limits</p>
                  </div>
                </div>

                <div class="p-5 sm:p-6 rounded-2xl bg-[#121614] border border-[#1F2420] flex flex-col justify-between">
                  <span class="text-xs font-mono uppercase tracking-wider text-[#9AA19C]">Constraint Solver</span>
                  <div class="mt-4">
                    <span class="text-3xl sm:text-4xl font-black text-[#B8F36B] font-mono">&lt; 1.2s</span>
                    <p class="text-[11px] text-[#777D78] mt-1">Google OR-Tools CP-SAT</p>
                  </div>
                </div>

                <div class="p-5 sm:p-6 rounded-2xl bg-[#121614] border border-[#1F2420] col-span-2 md:col-span-1 flex flex-col justify-between">
                  <span class="text-xs font-mono uppercase tracking-wider text-[#9AA19C]">Timetable Clashes</span>
                  <div class="mt-4">
                    <span class="text-3xl sm:text-4xl font-black text-white font-mono">0</span>
                    <p class="text-[11px] text-[#777D78] mt-1">Zero overlap hard constraint</p>
                  </div>
                </div>
              </div>

              <!-- Comparison Architecture -->
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-12">
                <div class="p-6 sm:p-8 rounded-3xl bg-[#121614] border border-[#1F2420]">
                  <div class="flex items-center justify-between mb-5">
                    <span class="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                      Traditional Campus Operations
                    </span>
                    <span class="text-[10px] font-mono text-[#777D78]">UNCOORDINATED SILOS</span>
                  </div>
                  <h3 class="text-xl sm:text-2xl font-bold text-white mb-4">Fragmented Decisions & Cascading Delays</h3>
                  <ul class="space-y-3.5 text-xs sm:text-sm text-[#9AA19C]">
                    <li class="flex items-start gap-3">
                      <span class="text-rose-400 font-bold">✕</span>
                      <span><strong>Disconnected Spreadsheets:</strong> Departments build isolated schedules leading to inadvertent double-bookings.</span>
                    </li>
                    <li class="flex items-start gap-3">
                      <span class="text-rose-400 font-bold">✕</span>
                      <span><strong>Manual Email Approvals:</strong> Booking requests take days, with no visibility into true physical room availability.</span>
                    </li>
                    <li class="flex items-start gap-3">
                      <span class="text-rose-400 font-bold">✕</span>
                      <span><strong>Disruption Chaos:</strong> When a faculty member is sick or a room is closed, manual reschedule attempts cause secondary clashes.</span>
                    </li>
                    <li class="flex items-start gap-3">
                      <span class="text-rose-400 font-bold">✕</span>
                      <span><strong>Zero Accessibility Matching:</strong> Mobility-impaired students assigned to upstairs halls lacking elevators.</span>
                    </li>
                  </ul>
                </div>

                <div class="p-6 sm:p-8 rounded-3xl bg-[#121614] border border-[#B8F36B]/30 relative shadow-[0_0_50px_-20px_rgba(184,243,107,0.15)]">
                  <div class="flex items-center justify-between mb-5">
                    <span class="text-xs font-mono font-bold uppercase tracking-wider text-[#B8F36B] flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full bg-[#B8F36B] animate-pulse"></span>
                      CITRIX Unified Operating System
                    </span>
                    <span class="text-[10px] font-mono text-[#B8F36B]">SYNCHRONIZED GRAPH</span>
                  </div>
                  <h3 class="text-xl sm:text-2xl font-bold text-white mb-4">Deterministic Precision & Autonomous Governance</h3>
                  <ul class="space-y-3.5 text-xs sm:text-sm text-[#9AA19C]">
                    <li class="flex items-start gap-3">
                      <span class="text-[#B8F36B] font-bold">✓</span>
                      <span><strong>Single Institutional Graph:</strong> Continuous mathematical synchronization across 27 venues, 40 faculty, and all student sections.</span>
                    </li>
                    <li class="flex items-start gap-3">
                      <span class="text-[#B8F36B] font-bold">✓</span>
                      <span><strong>Google OR-Tools CP-SAT Solver:</strong> Hard constraints (zero overlaps, lunch blackout) solved in seconds with auditable validation.</span>
                    </li>
                    <li class="flex items-start gap-3">
                      <span class="text-[#B8F36B] font-bold">✓</span>
                      <span><strong>Minimal-Move Disruption Repair:</strong> Automatic recovery solving unexpected leave by shifting the absolute minimum sessions.</span>
                    </li>
                    <li class="flex items-start gap-3">
                      <span class="text-[#B8F36B] font-bold">✓</span>
                      <span><strong>Institutional Self-Approval Guard:</strong> Strict rule: nobody can approve their own request, preventing administrative privilege abuse.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <!-- Advance Bar -->
              <div class="pt-6 border-t border-[#1F2420] flex items-center justify-end text-xs font-mono text-[#9AA19C]">
                <button onclick="window.__citrixGoToPage(2)" class="px-5 py-2.5 rounded-xl bg-[#B8F36B] text-[#101110] font-bold hover:bg-[#A6E854] transition-all flex items-center gap-2">
                  <span>Advance to CP-SAT Optimization Pipeline ↓</span>
                </button>
              </div>

            </div>
          </div>
        </section>

        <!-- ==============================================================
             PAGE 2: CP-SAT DECISION PIPELINE (IN-BETWEEN ARCHITECTURE)
             ============================================================== -->
        <section id="deck-page-2" class="citrix-landing-section w-full scroll-mt-24 transition-all duration-700 ease-out citrix-section-hidden" data-page="2">
          <div class="px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto">
            
            <!-- Section Header -->
            <div class="max-w-4xl mb-8 sm:mb-10">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E5E8E3] text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-[#101110] mb-4">
                03 · DETERMINISTIC DECISION PIPELINE
              </div>
              <h2 class="text-3xl sm:text-5xl md:text-6xl font-black tracking-[-0.03em] leading-[1.05] text-[#101110] mb-5">
                From Natural Language to<br/>
                <span class="text-[#777D78]">Mathematically Verified Campus Operations.</span>
              </h2>
              <p class="text-base sm:text-lg text-[#777D78] leading-relaxed">
                How faculty space inquiries, student elective enrollments, and unplanned leaves are transformed through our 7-stage constraint model into certified operational schedules.
              </p>
            </div>

            <!-- Pipeline Infographic Visual Showcase -->
            <div class="mb-10 rounded-3xl border border-[#E5E8E3] bg-white p-4 sm:p-7 shadow-premium overflow-hidden">
              <div class="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E8E3]">
                <div class="flex items-center gap-2.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#B8F36B] animate-pulse"></span>
                  <span class="text-xs font-mono font-bold uppercase tracking-wider text-[#101110]">
                    7-STAGE ARCHITECTURAL PIPELINE OVERVIEW
                  </span>
                </div>
                <span class="px-2.5 py-1 rounded-md bg-[#F0F2EE] text-[10px] font-mono font-semibold text-[#777D78]">
                  GOOGLE OR-TOOLS CP-SAT REASONING
                </span>
              </div>

              <!-- High-Resolution Graphic Display -->
              <div class="relative rounded-2xl overflow-hidden border border-[#E5E8E3] bg-[#F7F8F6] p-2 sm:p-4 group">
                <img src="./assets/pipeline_architecture.png" alt="CITRIX 7-Stage CP-SAT Optimization Pipeline" 
                  class="w-full h-auto object-contain rounded-xl shadow-sm transition-transform duration-700 group-hover:scale-[1.008]" />
              </div>
            </div>

            <!-- Detailed 7-Stage Interactive Breakdown Cards -->
            <div class="mb-10">
              <div class="text-xs font-mono uppercase tracking-wider text-[#777D78] mb-4 font-bold">
                Detailed Stage Specifications
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                
                <!-- Stage 01 -->
                <div class="p-5 rounded-2xl bg-white border border-[#E5E8E3] shadow-subtle hover:border-[#101110] transition-all">
                  <div class="flex items-center justify-between mb-3">
                    <span class="w-6 h-6 rounded-full bg-[#B8F36B] text-[#101110] font-mono font-black text-[11px] flex items-center justify-center">01</span>
                    <span class="text-[10px] font-mono text-[#777D78] uppercase">INGESTION</span>
                  </div>
                  <h4 class="font-bold text-sm text-[#101110] mb-1.5">Campus Data</h4>
                  <p class="text-[#777D78] leading-relaxed text-[11px]">
                    40 faculty profiles, student cohort enrollments, 27 physical classrooms & labs, course curricula, and recurring booking submissions.
                  </p>
                </div>

                <!-- Stage 02 -->
                <div class="p-5 rounded-2xl bg-white border border-[#E5E8E3] shadow-subtle hover:border-[#101110] transition-all">
                  <div class="flex items-center justify-between mb-3">
                    <span class="w-6 h-6 rounded-full bg-[#B8F36B] text-[#101110] font-mono font-black text-[11px] flex items-center justify-center">02</span>
                    <span class="text-[10px] font-mono text-[#777D78] uppercase">SEMANTIC NLP</span>
                  </div>
                  <h4 class="font-bold text-sm text-[#101110] mb-1.5">Intelligence Layer</h4>
                  <p class="text-[#777D78] leading-relaxed text-[11px]">
                    Natural-language understanding for English and Hinglish (e.g. <em>"Kal 3 se 5 robotics workshop ke liye 60 logon ka accessible room chahiye"</em>).
                  </p>
                </div>

                <!-- Stage 03 -->
                <div class="p-5 rounded-2xl bg-white border border-[#E5E8E3] shadow-subtle hover:border-[#101110] transition-all">
                  <div class="flex items-center justify-between mb-3">
                    <span class="w-6 h-6 rounded-full bg-[#B8F36B] text-[#101110] font-mono font-black text-[11px] flex items-center justify-center">03</span>
                    <span class="text-[10px] font-mono text-[#777D78] uppercase">FORMAL LOGIC</span>
                  </div>
                  <h4 class="font-bold text-sm text-[#101110] mb-1.5">Constraint Modelling</h4>
                  <p class="text-[#777D78] leading-relaxed text-[11px]">
                    Faculty max-hour limits, student elective conflicts, step-free wheelchair routing, and institutional priority rules (Exams &gt; Classes &gt; Clubs).
                  </p>
                </div>

                <!-- Stage 04 (FEATURED) -->
                <div class="p-5 rounded-2xl bg-[#080A09] text-white border-2 border-[#B8F36B] shadow-glow-sm">
                  <div class="flex items-center justify-between mb-3">
                    <span class="w-6 h-6 rounded-full bg-[#B8F36B] text-[#101110] font-mono font-black text-[11px] flex items-center justify-center">04</span>
                    <span class="text-[10px] font-mono text-[#B8F36B] uppercase font-bold">SOLVER ENGINE</span>
                  </div>
                  <h4 class="font-bold text-sm text-white mb-1.5">CP-SAT Optimization</h4>
                  <p class="text-[#9AA19C] leading-relaxed text-[11px]">
                    Google OR-Tools CP-SAT solver deterministically proves mathematical feasibility and synthesizes conflict-free timetables in &lt;1.2s.
                  </p>
                </div>

                <!-- Stage 05 -->
                <div class="p-5 rounded-2xl bg-white border border-[#E5E8E3] shadow-subtle hover:border-[#101110] transition-all">
                  <div class="flex items-center justify-between mb-3">
                    <span class="w-6 h-6 rounded-full bg-[#B8F36B] text-[#101110] font-mono font-black text-[11px] flex items-center justify-center">05</span>
                    <span class="text-[10px] font-mono text-[#777D78] uppercase">AUDIT CHECKS</span>
                  </div>
                  <h4 class="font-bold text-sm text-[#101110] mb-1.5">Validation</h4>
                  <p class="text-[#777D78] leading-relaxed text-[11px]">
                    Hard-constraint checks: zero overlaps, campus 13:00–14:00 lunch blackout, 3h continuous labs, and strict 50% capacity alternating exam desk cap.
                  </p>
                </div>

                <!-- Stage 06 -->
                <div class="p-5 rounded-2xl bg-white border border-[#E5E8E3] shadow-subtle hover:border-[#101110] transition-all">
                  <div class="flex items-center justify-between mb-3">
                    <span class="w-6 h-6 rounded-full bg-[#B8F36B] text-[#101110] font-mono font-black text-[11px] flex items-center justify-center">06</span>
                    <span class="text-[10px] font-mono text-[#777D78] uppercase">GOVERNANCE</span>
                  </div>
                  <h4 class="font-bold text-sm text-[#101110] mb-1.5">Human Approval</h4>
                  <p class="text-[#777D78] leading-relaxed text-[11px]">
                    Admin review with strict Institutional Self-Approval Guard: nobody can approve their own request, ensuring ethical separation of powers.
                  </p>
                </div>

                <!-- Stage 07 -->
                <div class="p-5 rounded-2xl bg-white border border-[#E5E8E3] shadow-subtle hover:border-[#101110] transition-all col-span-1 md:col-span-2">
                  <div class="flex items-center justify-between mb-3">
                    <span class="w-6 h-6 rounded-full bg-[#B8F36B] text-[#101110] font-mono font-black text-[11px] flex items-center justify-center">07</span>
                    <span class="text-[10px] font-mono text-[#777D78] uppercase">LIVE SYNCHRONIZATION</span>
                  </div>
                  <h4 class="font-bold text-sm text-[#101110] mb-1.5">Campus Execution</h4>
                  <p class="text-[#777D78] leading-relaxed text-[11px]">
                    Real-time publication: synchronized student cohort timetables, midsem exam room rosters, live digital signage displays, and faculty notifications across all departments.
                  </p>
                </div>

              </div>
            </div>

            <!-- Sequence Banner from image -->
            <div class="p-4 rounded-2xl bg-[#080A09] text-white border border-[#1F2420] flex flex-wrap items-center justify-between gap-4 text-xs font-mono mb-10">
              <div class="flex items-center gap-2">
                <span class="text-[#B8F36B]">⚡ AI UNDERSTANDS</span>
                <span class="text-[#777D78]">→</span>
                <span class="text-white">📅 CP-SAT OPTIMIZES</span>
                <span class="text-[#777D78]">→</span>
                <span class="text-emerald-400">🛡️ VALIDATOR CHECKS</span>
                <span class="text-[#777D78]">→</span>
                <span class="text-sky-400">👥 HUMANS APPROVE</span>
                <span class="text-[#777D78]">→</span>
                <span class="text-[#B8F36B]">✓ CAMPUS UPDATES</span>
              </div>
              <span class="text-[11px] text-[#9AA19C]">Zero-Conflict Guarantee</span>
            </div>

            <!-- Return to Top Bar -->
            <div class="pt-6 border-t border-[#E5E8E3] flex items-center justify-center text-xs font-mono">
              <button onclick="window.__citrixGoToPage(0)" class="px-6 py-3 rounded-xl bg-[#080A09] text-white font-bold hover:bg-[#151917] transition-all flex items-center gap-2 shadow-sm hover:shadow-md">
                <span>Return to the Top ↑</span>
              </button>
            </div>

          </div>
        </section>

      </main>

      <!-- ==========================================
           PERSISTENT FLOATING BOTTOM STEPPER CONTROLLER
           ========================================== -->
      <aside aria-label="Deck Stepper" class="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
        <div class="bg-[#080A09]/90 backdrop-blur-2xl border border-[#1F2420] rounded-2xl p-1.5 shadow-floating flex items-center gap-1.5 sm:gap-2 text-xs">
          
          <!-- Prev Button -->
          <button id="deck-btn-prev" onclick="window.__citrixPrevPage()" 
            class="px-3 py-1.5 rounded-xl text-[#9AA19C] hover:text-white hover:bg-[#121614] transition-all font-mono flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
            <span class="hidden sm:inline">Prev</span>
          </button>

          <!-- 3 Page Indicators / Clickable Pills -->
          <div class="flex items-center gap-1 px-1">
            <button onclick="window.__citrixGoToPage(0)" class="deck-step-pill px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all bg-[#B8F36B] text-[#101110]">
              01
            </button>
            <button onclick="window.__citrixGoToPage(1)" class="deck-step-pill px-2.5 py-1 rounded-lg font-mono text-[11px] font-medium transition-all text-[#9AA19C] hover:text-white hover:bg-[#121614]">
              02
            </button>
            <button onclick="window.__citrixGoToPage(2)" class="deck-step-pill px-2.5 py-1 rounded-lg font-mono text-[11px] font-medium transition-all text-[#9AA19C] hover:text-white hover:bg-[#121614]">
              03
            </button>
          </div>

          <!-- Current Title Indicator -->
          <div class="h-4 w-px bg-[#1F2420] mx-0.5 hidden sm:block"></div>
          <div id="deck-current-label" class="text-[11px] font-mono text-white font-bold px-2 hidden sm:block min-w-[95px]">
            01 · Platform
          </div>

          <!-- Next Button -->
          <button id="deck-btn-next" onclick="window.__citrixNextPage()" 
            class="px-3 py-1.5 rounded-xl bg-[#1F2420] text-[#B8F36B] hover:bg-[#B8F36B] hover:text-[#101110] transition-all font-mono font-bold flex items-center gap-1">
            <span class="hidden sm:inline">Next ↓</span>
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>
          </button>

          <!-- Keyboard Hints -->
          <div class="h-4 w-px bg-[#1F2420] mx-0.5 hidden md:block"></div>
          <div class="text-[10px] font-mono text-[#777D78] px-1.5 hidden md:block">
            ← / → Keys
          </div>

        </div>
      </aside>

    </div>
  `;

  // --- Dynamic Function Handlers ---

  // Mobile Menu Toggle
  window.__citrixToggleMobileMenu = function() {
    const drawer = document.getElementById('mobile-nav-drawer');
    if (drawer) {
      drawer.classList.toggle('hidden');
    }
  };

  // 1. Synchronized Indicator State Updater
  function updateActiveIndicators(targetIndex) {
    if (targetIndex < 0 || targetIndex >= totalPages) return;
    currentDeckPage = targetIndex;

    // Update Top Navbar Buttons
    const navPills = document.querySelectorAll('.nav-page-btn');
    navPills.forEach((btn, idx) => {
      if (idx === targetIndex) {
        btn.className = 'nav-page-btn px-3 py-1.5 rounded-lg transition-all bg-[#080A09] text-white shadow-sm';
      } else {
        btn.className = 'nav-page-btn px-3 py-1.5 rounded-lg transition-all text-[#777D78] hover:text-[#101110]';
      }
    });

    // Update Bottom Floating Stepper Pills
    const stepPills = document.querySelectorAll('.deck-step-pill');
    stepPills.forEach((pill, idx) => {
      if (idx === targetIndex) {
        pill.className = 'deck-step-pill px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all bg-[#B8F36B] text-[#101110] shadow-[0_0_10px_#B8F36B]';
      } else {
        pill.className = 'deck-step-pill px-2.5 py-1 rounded-lg font-mono text-[11px] font-medium transition-all text-[#9AA19C] hover:text-white hover:bg-[#121614]';
      }
    });

    // Update Label and Prev/Next button states
    const labelEl = document.getElementById('deck-current-label');
    if (labelEl) {
      labelEl.textContent = pageNames[targetIndex];
    }

    const prevBtn = document.getElementById('deck-btn-prev');
    if (prevBtn) {
      prevBtn.disabled = (targetIndex === 0);
    }

    const nextBtn = document.getElementById('deck-btn-next');
    if (nextBtn) {
      if (targetIndex === totalPages - 1) {
        nextBtn.innerHTML = `<span class="hidden sm:inline">Top ↑</span><svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>`;
      } else {
        nextBtn.innerHTML = `<span class="hidden sm:inline">Next ↓</span><svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>`;
      }
    }
  }

  // Smooth-scroll navigation
  window.__citrixGoToPage = function(targetIndex) {
    if (targetIndex < 0 || targetIndex >= totalPages) return;
    const targetEl = document.getElementById(`deck-page-${targetIndex}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      updateActiveIndicators(targetIndex);
    }
  };

  window.__citrixNextPage = function() {
    if (currentDeckPage < totalPages - 1) {
      window.__citrixGoToPage(currentDeckPage + 1);
    } else {
      window.__citrixGoToPage(0);
    }
  };

  window.__citrixPrevPage = function() {
    if (currentDeckPage > 0) {
      window.__citrixGoToPage(currentDeckPage - 1);
    }
  };

  // Scroll Spy & Reveal Animation IntersectionObserver
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('citrix-section-hidden');
        entry.target.classList.add('citrix-section-visible');

        const pageIdx = parseInt(entry.target.getAttribute('data-page') || '0', 10);
        updateActiveIndicators(pageIdx);
      }
    });
  }, {
    threshold: 0.3,
    rootMargin: '-40px 0px -40px 0px'
  });

  // Attach observer to all landing sections
  setTimeout(() => {
    document.querySelectorAll('.citrix-landing-section').forEach(sec => {
      sectionObserver.observe(sec);
    });
  }, 100);

  // Keyboard navigation for slide deck
  const onKeyDown = (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      window.__citrixNextPage();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      window.__citrixPrevPage();
    }
  };
  window.addEventListener('keydown', onKeyDown);

  // 2. Hero Mode Switcher (renumbered — engine tab switcher removed)
  window.__citrixSetHeroMode = function(mode) {
    currentHeroMode = mode;
    const aerialLayer = document.getElementById('hero-aerial-layer');
    const threeContainer = document.getElementById('hero-threejs-container');
    const btnAerial = document.getElementById('btn-mode-aerial');
    const btnThree = document.getElementById('btn-mode-threejs');

    if (mode === 'aerial') {
      if (aerialLayer) {
        aerialLayer.classList.remove('opacity-0', 'pointer-events-none', 'z-0');
        aerialLayer.classList.add('opacity-100', 'z-10');
      }
      if (threeContainer) {
        threeContainer.classList.remove('opacity-100', 'z-10');
        threeContainer.classList.add('opacity-0', 'pointer-events-none', 'z-0');
      }
      if (btnAerial) btnAerial.className = 'px-3 py-1.5 rounded-xl font-bold transition-all bg-[#1F2420] text-[#B8F36B] shadow-sm';
      if (btnThree) btnThree.className = 'px-3 py-1.5 rounded-xl font-medium transition-all text-[#9AA19C] hover:text-white';
    } else {
      if (threeContainer) {
        threeContainer.classList.remove('opacity-0', 'pointer-events-none', 'z-0');
        threeContainer.classList.add('opacity-100', 'z-10');
      }
      if (aerialLayer) {
        aerialLayer.classList.remove('opacity-100', 'z-10');
        aerialLayer.classList.add('opacity-0', 'pointer-events-none', 'z-0');
      }
      if (btnThree) btnThree.className = 'px-3 py-1.5 rounded-xl font-bold transition-all bg-[#1F2420] text-[#B8F36B] shadow-sm';
      if (btnAerial) btnAerial.className = 'px-3 py-1.5 rounded-xl font-medium transition-all text-[#9AA19C] hover:text-white';

      if (!threeSceneInstance && threeContainer) {
        initThreeJsHero(threeContainer);
      }
    }
  };

  // 4. Hero Building Selection
  window.__citrixHeroSelectBuilding = function(bId) {
    const building = BUILDINGS.find(b => b.id === bId) || BUILDINGS[0];
    selectedHeroBuilding = building;
    
    const nameEl = document.getElementById('inspector-building-name');
    const descEl = document.getElementById('inspector-building-desc');
    if (nameEl && descEl) {
      nameEl.textContent = building.name;
      descEl.textContent = `${building.code} · ${building.floors} Floors · ${building.totalRooms} Rooms · ${building.primaryUse}`;
    }

    if (threeSceneInstance && currentHeroMode === 'threejs') {
      threeSceneInstance.focusBuilding(bId);
    }
  };

  // 5. Three.js Initializer
  function initThreeJsHero(canvasContainer) {
    if (threeSceneInstance) return;
    try {
      threeSceneInstance = new CampusScene(canvasContainer, (bId) => {
        store.selectBuilding(bId);
        window.__citrixHeroSelectBuilding(bId);
      });
      window.__citrixLandingScene = threeSceneInstance;
    } catch (err) {
      console.warn('Three.js hero canvas notice:', err);
    }
  }

  // Scroll event listener for Navbar elevation
  const navbar = document.getElementById('citrix-navbar');
  const onScroll = () => {
    if (!navbar) return;
    if (window.scrollY > 30) {
      navbar.classList.add('py-2');
      navbar.classList.remove('py-4');
    } else {
      navbar.classList.add('py-4');
      navbar.classList.remove('py-2');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  // ============================================================
  // INTRO ANIMATION CONTROLLER — learnwithzero.com style
  // Runs once per page load; respects prefers-reduced-motion.
  // ============================================================
  (function runIntroAnimation() {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const intro = document.getElementById('citrix-intro');
    if (!intro) return;

    if (prefersReduced) {
      intro.remove();
      return;
    }

    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panelTop    = document.getElementById('intro-panel-top');
    const panelBot    = document.getElementById('intro-panel-bottom');
    const line1       = document.getElementById('intro-line1');
    const line2       = document.getElementById('intro-line2');
    const symbol      = document.getElementById('intro-symbol');
    const progressBar = document.getElementById('intro-progress-bar');
    const counter     = document.getElementById('intro-counter');
    const tagWords    = document.querySelectorAll('.intro-tag-word');

    // Phase 1 (t=0): Brand symbol fades in
    requestAnimationFrame(() => {
      if (symbol) {
        symbol.style.opacity = '1';
        symbol.style.transform = 'translateY(0)';
      }
    });

    // Phase 2 (t=200ms): Progress bar starts + counter ticks
    setTimeout(() => {
      if (progressBar) progressBar.style.transform = 'scaleX(1)';

      let count = 0;
      const totalDuration = 2200;
      const interval = totalDuration / 100;
      const ticker = setInterval(() => {
        count = Math.min(count + 1, 100);
        if (counter) counter.textContent = count + '%';
        if (count >= 100) clearInterval(ticker);
      }, interval);
    }, 200);

    // Phase 3 (t=600ms): Headline lines reveal bottom-up
    setTimeout(() => {
      if (line1) line1.style.clipPath = 'inset(0 0 0% 0)';
    }, 600);
    setTimeout(() => {
      if (line2) line2.style.clipPath = 'inset(0 0 0% 0)';
    }, 720);

    // Phase 4 (t=1100ms): Tagline words stagger in
    setTimeout(() => {
      tagWords.forEach(w => {
        const extra = parseFloat(w.dataset.delay || 0) * 1000;
        setTimeout(() => {
          w.style.transform = 'translateY(0)';
        }, extra);
      });
    }, 1100);

    // Phase 5 (t=2900ms): Panels split
    setTimeout(() => {
      if (panelTop) {
        panelTop.style.transform = 'translateY(-100%)';
      }
      if (panelBot) {
        panelBot.style.height  = '50vh';
        panelBot.style.transform = 'translateY(100vh)';
      }
    }, 2900);

    // Phase 6 (t=3750ms): Remove overlay, restore scroll, animate content in
    setTimeout(() => {
      document.body.style.overflow = origOverflow;
      intro.style.transition = 'opacity 0.3s ease';
      intro.style.opacity    = '0';
      intro.style.pointerEvents = 'none';

      _animateHeroContentIn();

      setTimeout(() => intro.remove(), 350);
    }, 3750);
  })();

  function _animateHeroContentIn() {
    const navbar = document.getElementById('citrix-navbar');
    if (navbar) {
      navbar.style.transform = 'translateY(-16px)';
      navbar.style.opacity   = '0';
      navbar.style.transition = 'transform 0.7s cubic-bezier(0.16,1,0.3,1), opacity 0.7s ease';
      requestAnimationFrame(() => {
        setTimeout(() => {
          navbar.style.transform = 'translateY(0)';
          navbar.style.opacity   = '1';
        }, 80);
      });
    }

    _staggerEl('#deck-page-0 .inline-flex', 0.08, 200);
    _staggerEl('#deck-page-0 h1', 0.0, 300);
    _staggerEl('#deck-page-0 p', 0.0, 450);
    _staggerEl('#deck-page-0 .flex.flex-wrap', 0.0, 560);
  }

  function _staggerEl(selector, stagger, delay) {
    const els = document.querySelectorAll(selector);
    els.forEach((el, i) => {
      el.style.opacity   = '0';
      el.style.transform = 'translateY(22px)';
      el.style.transition = `opacity 0.75s cubic-bezier(0.16,1,0.3,1) ${delay + i*stagger*1000}ms, transform 0.75s cubic-bezier(0.16,1,0.3,1) ${delay + i*stagger*1000}ms`;
      setTimeout(() => {
        el.style.opacity   = '1';
        el.style.transform = 'translateY(0)';
      }, delay + i * stagger * 1000);
    });
  }
}
