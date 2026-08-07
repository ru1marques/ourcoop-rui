const layout = [
  [7, 8, 5], [15, 8, 4], [23, 8, 4], [26, 4, 5],
  [33, 8, 2], [35, 4, 5], [42, 4, 4], [48, 4, 5],
  [58, 8, 3], [66, 8, 6], [77, 4, 3], [85, 4, 6],

  [35, 12, 3], [42, 12, 8], [52, 12, 3], [63, 12, 3],
  [81, 12, 3], [91, 12, 3],

  [13, 19, 3], [20, 19, 2], [26, 19, 6], [40, 19, 6],
  [48, 19, 3], [55, 19, 5], [63, 19, 4], [70, 19, 3],
  [76, 19, 5], [6, 23, 3],

  [8, 30, 8], [34, 27, 3], [40, 27, 6], [46, 30, 2],
  [50, 30, 8], [68, 30, 7], [92, 30, 4],

  [5, 37, 1], [12, 37, 3], [21, 40, 4], [31, 40, 3],
  [36, 43, 5], [63, 40, 3], [69, 43, 2], [76, 40, 5],
  [82, 40, 4], [90, 40, 6],

  [5, 44, 3], [12, 47, 3], [20, 44, 3], [27, 47, 2],
  [39, 47, 2], [46, 47, 5], [69, 47, 3], [78, 47, 3],
  [92, 47, 7],

  [5, 55, 3], [8, 59, 7], [20, 59, 8], [47, 59, 7],
  [63, 59, 3], [78, 59, 3],

  [14, 66, 3], [23, 66, 9], [50, 66, 3], [61, 66, 4],
  [68, 66, 2], [78, 66, 7], [88, 66, 5],

  [5, 77, 6], [16, 73, 3], [31, 73, 3], [34, 77, 2],
  [40, 77, 5], [46, 77, 6], [53, 77, 6], [64, 73, 7],
  [71, 73, 4], [85, 73, 4],

  [9, 84, 3], [16, 81, 3], [31, 84, 3], [39, 84, 5],
  [45, 84, 6], [63, 84, 7], [69, 84, 3], [79, 84, 3],
  [86, 84, 3], [94, 84, 6],

  [14, 88, 13]
];

const scrollSection = document.querySelector('.asterisk-scroll');
const scene = document.getElementById('asteriskScene');
const field = document.getElementById('asteriskField');
const title = document.getElementById('mission-title');
const titleLines = Array.from(title.querySelectorAll('span'));
const progressBar = document.getElementById('asteriskProgressBar');
const storySection = document.querySelector('.story-scroll');
const storyCopy = document.getElementById('storyCopy');
const videoSection = document.querySelector('.video-scroll');
const scrollVideo = document.getElementById('visionsScrollVideo');
const videoProgress = document.getElementById('visionsVideoProgress');
const joinCards = Array.from(document.querySelectorAll('.join-card'));
const gallerySection = document.querySelector('.scroll-gallery');
const galleryCards = Array.from(document.querySelectorAll('.scroll-gallery__item'));

const stars = [];
const pointer = { x: 0, y: 0, active: false };

const config = {
  mouseRadius: 380,
  mouseSensitivity: 0.24,
  spring: 0.065,
  damping: 0.8,
  safePaddingX: 64,
  safePaddingY: 48,
  revealWindow: 0.14
};

let safeZone = { left: 0, right: 0, top: 0, bottom: 0 };

const storyWords = [];
let storyCharacterCount = 0;
let storyLineCount = 1;
let lastStoryWidth = 0;
let scrollVideoDuration = 0;
let targetVideoTime = 0;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function seededNoise(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function prepareStoryWords() {
  const walker = document.createTreeWalker(storyCopy, NodeFilter.SHOW_TEXT);
  const textNodes = [];

  while (walker.nextNode()) {
    if (walker.currentNode.textContent.trim()) textNodes.push(walker.currentNode);
  }

  textNodes.forEach((node) => {
    if (node.parentElement.closest('.story-copy__more')) return;

    const fragment = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part || /^\s+$/.test(part)) {
        fragment.appendChild(document.createTextNode(part));
        return;
      }

      const word = document.createElement('span');
      word.className = 'story-word';

      if (node.parentElement.closest('.story-logo')) word.classList.add('story-logo');
      if (node.parentElement.closest('.story-markers')) word.classList.add('story-markers');

      word.dataset.word = part;
      word.textContent = part;
      fragment.appendChild(word);
    });

    node.replaceWith(fragment);
  });

  storyCopy.querySelectorAll('.story-word').forEach((item) => {
    item.dataset.readStart = storyCharacterCount;
    storyCharacterCount += item.textContent.length + 1;
    storyWords.push(item);
  });
}

prepareStoryWords();

function layoutStoryLines() {
  const lines = [];

  storyWords.forEach((word) => {
    const top = word.offsetTop;
    let line = lines.find((candidate) => Math.abs(candidate.top - top) <= 3);

    if (!line) {
      line = { top, words: [], left: word.offsetLeft, right: word.offsetLeft + word.offsetWidth };
      lines.push(line);
    }

    line.words.push(word);
    line.left = Math.min(line.left, word.offsetLeft);
    line.right = Math.max(line.right, word.offsetLeft + word.offsetWidth);
  });

  lines.sort((a, b) => a.top - b.top);
  storyLineCount = Math.max(1, lines.length);

  lines.forEach((line, lineIndex) => {
    const lineWidth = Math.max(1, line.right - line.left);

    line.words.forEach((word) => {
      word._storyLine = lineIndex;
      word._storyLineX = (word.offsetLeft - line.left) / lineWidth;
      word._storyLineWidth = Math.max(word.offsetWidth / lineWidth, .001);
    });
  });
}

layoutStoryLines();

scrollVideo.addEventListener('loadedmetadata', () => {
  scrollVideoDuration = scrollVideo.duration || 0;
  const scrollLength = clamp(scrollVideoDuration * 45, 400, 800);
  videoSection.style.height = `${scrollLength}vh`;

  if (scrollVideoDuration > 0) scrollVideo.currentTime = .001;
});

scrollVideo.addEventListener('loadeddata', () => {
  videoSection.classList.add('is-ready');
});

scrollVideo.addEventListener('error', () => {
  const status = document.getElementById('visionsVideoStatus');
  status.textContent = 'Film unavailable';
});

layout.forEach(([x, y, amount], index) => {
  const el = document.createElement('div');
  el.className = 'asterisk-star';
  el.textContent = '*'.repeat(amount);
  field.appendChild(el);

  stars.push({
    el,
    nx: clamp((x + (seededNoise(index + 1) - .5) * 10) / 100, .025, .975),
    ny: clamp((y + (seededNoise(index + 101) - .5) * 8) / 100, .025, .975),
    baseX: 0,
    baseY: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    phase: index * 0.73,
    revealAt: index / Math.max(1, layout.length - 1)
  });
});

const directoryMembers = [
  ['Margaret Ellis', 'Board Chairperson'],
  ['David Thornton', 'General Manager'],
  ['Sarah Whitfield', 'Treasurer'],
  ['James Holloway', 'Secretary'],
  ['Catherine Marsh', 'Operations Director'],
  ['Robert Sinclair', 'Membership Coordinator'],
  ['Emily Ashford', 'Community Liaison'],
  ['Thomas Beckett', 'Finance Officer'],
  ['Laura Henning', 'Education Committee Lead'],
  ['Andrew Prescott', 'Vice Chairperson'],
  ['Diana Caldwell', 'Marketing Director'],
  ['Michael Norwood', 'Compliance Officer'],
  ['Helen Fairbanks', 'Member Relations Manager'],
  ['Steven Cartwright', 'Supply Chain Coordinator'],
  ['Patricia Langford', 'Sustainability Officer'],
  ['George Pemberton', 'Risk Analyst'],
  ['Olivia Stratton', 'Communications Lead'],
  ['William Hargrove', 'Development Director'],
  ['Rachel Kinsley', 'Audit Committee Chair'],
  ['Nathan Blackwood', 'Program Manager']
];

const directoryGrid = document.getElementById('directoryGrid');
[...directoryMembers, ...directoryMembers].forEach(([name, role], index) => {
  const member = document.createElement('article');
  member.className = 'directory-member';
  member.innerHTML = `<strong>${name}</strong><span>${role}</span>`;
  directoryGrid.appendChild(member);
});

const directorySection = document.querySelector('.directory-section');

function syncDirectoryLayout() {
  const navigation = document.querySelector('.hero__nav');
  const sectionLeft = directorySection.getBoundingClientRect().left;
  const sectionPadding = parseFloat(getComputedStyle(directorySection).paddingLeft) || 0;
  const navLeft = navigation.getBoundingClientRect().left;
  const indent = window.innerWidth <= 780 ? 0 : Math.max(0, navLeft - sectionLeft - sectionPadding);
  document.documentElement.style.setProperty('--nav-content-indent', `${indent}px`);

  const columns = window.innerWidth <= 780 ? 2 : window.innerWidth <= 1120 ? 4 : 8;
  directoryGrid.querySelectorAll('.directory-member').forEach((member, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    member.style.setProperty('--member-delay', `${(row * 90) + (column * 115)}ms`);
  });
}

syncDirectoryLayout();
window.addEventListener('resize', syncDirectoryLayout, { passive: true });

const directoryObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  });
}, { threshold: .18 });
directoryObserver.observe(directorySection);

function initialiseTextDecoding() {
  if (reducedMotion.matches) return;

  const ignored = '.asterisk-star, script, style, noscript, [aria-hidden="true"]';
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const targets = new Map();

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    const original = node.nodeValue;

    if (!parent || !original.trim() || parent.closest(ignored)) continue;

    const nodes = targets.get(parent) || [];
    nodes.push({ node, original });
    targets.set(parent, nodes);
  }

  const decode = (entries, element) => {
    const duration = element.closest('.story-scroll')
      ? 1250
      : element.closest('.asterisk-scroll')
        ? 900
        : element.closest('.join-scroll')
          ? 850
          : 520;
    const start = performance.now();

    const frame = (now) => {
      const progress = easeOutCubic(clamp((now - start) / duration, 0, 1));

      entries.forEach(({ node, original }) => {
        const visibleCharacters = Math.floor(original.length * progress);
        node.nodeValue = Array.from(original, (character, index) => {
          if (/\s/.test(character) || index < visibleCharacters) return character;
          return '*';
        }).join('');
      });

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        entries.forEach(({ node, original }) => { node.nodeValue = original; });
      }
    };

    requestAnimationFrame(frame);
  };

  const observer = new IntersectionObserver((observed) => {
    observed.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      decode(targets.get(entry.target), entry.target);
    });
  }, { threshold: .12, rootMargin: '0px 0px -4% 0px' });

  targets.forEach((entries, element) => {
    entries.forEach(({ node, original }) => {
      node.nodeValue = Array.from(original, (character) => /\s/.test(character) ? character : '*').join('');
    });
    observer.observe(element);
  });
}

initialiseTextDecoding();

function initialiseAnimatedCase() {
  const description = document.querySelector('.brand-description');
  if (!description || reducedMotion.matches) return;

  const baseText = '* International Cooperative of Artists';

  setTimeout(() => {
    description.replaceChildren(...Array.from(baseText, (character) => {
      const letter = document.createElement('span');
      letter.className = 'brand-description__letter';
      if (character === ' ') letter.classList.add('is-space');
      letter.textContent = character;
      letter.dataset.base = character;
      return letter;
    }));

    const letters = Array.from(description.children).filter((letter) => /[a-z]/i.test(letter.dataset.base));

    const animateLetters = () => {
      const available = [...letters].sort(() => Math.random() - .5);
      const selection = available.slice(0, 3 + Math.floor(Math.random() * 4));

      selection.forEach((letter, index) => {
        setTimeout(() => {
          letter.textContent = letter.dataset.base.toUpperCase();
          setTimeout(() => {
            letter.textContent = letter.dataset.base;
          }, 700);
        }, index * 45);
      });
    };

    animateLetters();
    setInterval(animateLetters, 3400);
  }, 900);
}

initialiseAnimatedCase();

function initialiseJoinTitleCase() {
  if (reducedMotion.matches) return;

  const titles = Array.from(document.querySelectorAll('.join-card h2'));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);

      setTimeout(() => {
        const title = entry.target;
        const textNodes = Array.from(title.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE);

        textNodes.forEach((node) => {
          const fragment = document.createDocumentFragment();
          Array.from(node.nodeValue).forEach((character) => {
            if (/\s/.test(character)) {
              fragment.appendChild(document.createTextNode(character));
              return;
            }

            const letter = document.createElement('span');
            letter.className = 'join-title__letter';
            letter.dataset.base = character;
            letter.textContent = character;
            fragment.appendChild(letter);
          });
          node.replaceWith(fragment);
        });

        const letters = Array.from(title.querySelectorAll('.join-title__letter'));
        setInterval(() => {
          letters.forEach((letter) => {
            if (Math.random() > .16) return;
            const base = letter.dataset.base;
            letter.textContent = Math.random() > .5 ? base.toUpperCase() : base.toLowerCase();
          });
        }, 420);
      }, 950);
    });
  }, { threshold: .15 });

  titles.forEach((title) => observer.observe(title));
}

initialiseJoinTitleCase();

const siteHeader = document.querySelector('.hero');
const globalTopbar = document.querySelector('.hero__topbar');
const sectionNav = document.querySelector('.hero__nav');
const sectionNavLinks = Array.from(sectionNav.querySelectorAll('a[href^="#"]'));
const sectionNavTargets = sectionNavLinks.map((link) => document.querySelector(link.getAttribute('href')));

function updateSectionNavigation() {
  const compact = window.scrollY >= siteHeader.offsetHeight * .72;
  let activeIndex = 0;

  sectionNavTargets.forEach((section, index) => {
    if (section && section.getBoundingClientRect().top <= window.innerHeight * .38) {
      activeIndex = index;
    }
  });

  sectionNav.classList.toggle('is-compact', compact);
  sectionNav.style.setProperty('--active-index', activeIndex);
  sectionNavLinks.forEach((link, index) => link.classList.toggle('is-active', compact && index === activeIndex));
}

function updateNavigationContrast() {
  const probeY = Math.min(window.innerHeight - 1, globalTopbar.getBoundingClientRect().top + 18);
  const backgroundSections = Array.from(document.querySelectorAll('.join-scroll__content, .directory-section, .bylaws-section, .partners-faq, .content-section'));
  let lightBackground = false;

  backgroundSections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    if (rect.top > probeY || rect.bottom <= probeY) return;

    const match = getComputedStyle(section).backgroundColor.match(/[\d.]+/g);
    if (!match || match.length < 3) return;

    const [red, green, blue] = match.map(Number);
    const luminance = red * .2126 + green * .7152 + blue * .0722;
    lightBackground = luminance > 145;
  });

  globalTopbar.classList.toggle('on-light', lightBackground);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function updateSafeZone() {
  const sceneRect = scene.getBoundingClientRect();
  const titleRect = title.getBoundingClientRect();

  safeZone = {
    left: titleRect.left - sceneRect.left - config.safePaddingX,
    right: titleRect.right - sceneRect.left + config.safePaddingX,
    top: titleRect.top - sceneRect.top - config.safePaddingY,
    bottom: titleRect.bottom - sceneRect.top + config.safePaddingY
  };
}

function pushOutsideSafeZone(x, y, margin = 0) {
  const left = safeZone.left - margin;
  const right = safeZone.right + margin;
  const top = safeZone.top - margin;
  const bottom = safeZone.bottom + margin;

  const inside = x > left && x < right && y > top && y < bottom;
  if (!inside) return { x, y };

  const distances = [
    { side: 'left', value: Math.abs(x - left) },
    { side: 'right', value: Math.abs(right - x) },
    { side: 'top', value: Math.abs(y - top) },
    { side: 'bottom', value: Math.abs(bottom - y) }
  ].sort((a, b) => a.value - b.value);

  switch (distances[0].side) {
    case 'left': x = left; break;
    case 'right': x = right; break;
    case 'top': y = top; break;
    case 'bottom': y = bottom; break;
  }

  return { x, y };
}

function layoutStars() {
  const rect = scene.getBoundingClientRect();
  updateSafeZone();

  stars.forEach((star) => {
    const safe = pushOutsideSafeZone(
      star.nx * rect.width,
      star.ny * rect.height,
      12
    );

    star.baseX = safe.x;
    star.baseY = safe.y;

    if (star.x === 0 && star.y === 0) {
      star.x = star.baseX;
      star.y = star.baseY;
    }

    star.width = star.el.offsetWidth;
    star.height = star.el.offsetHeight;
  });

  for (let iteration = 0; iteration < 14; iteration += 1) {
    stars.forEach((star, index) => {
      const starWidth = star.width;
      const starHeight = star.height;

      for (let otherIndex = index + 1; otherIndex < stars.length; otherIndex += 1) {
        const other = stars[otherIndex];
        const dx = other.baseX - star.baseX;
        const dy = other.baseY - star.baseY;
        const overlapX = (starWidth + other.width) * .5 + 8 - Math.abs(dx);
        const overlapY = (starHeight + other.height) * .5 + 7 - Math.abs(dy);

        if (overlapX <= 0 || overlapY <= 0) continue;

        if (overlapX < overlapY) {
          const direction = dx >= 0 ? 1 : -1;
          star.baseX -= overlapX * .52 * direction;
          other.baseX += overlapX * .52 * direction;
        } else {
          const direction = dy >= 0 ? 1 : -1;
          star.baseY -= overlapY * .52 * direction;
          other.baseY += overlapY * .52 * direction;
        }
      }

      star.baseX = clamp(star.baseX, starWidth * .5 + 4, rect.width - starWidth * .5 - 4);
      star.baseY = clamp(star.baseY, starHeight * .5 + 4, rect.height - starHeight * .5 - 4);

      const safe = pushOutsideSafeZone(star.baseX, star.baseY, 12);
      star.baseX = safe.x;
      star.baseY = safe.y;
    });
  }
}

function getScrollProgress() {
  const maxScroll = scrollSection.offsetHeight - window.innerHeight;
  if (maxScroll <= 0) return 1;

  const rect = scrollSection.getBoundingClientRect();
  return clamp(-rect.top / maxScroll, 0, 1);
}

function updateAsteriskTitle(progress) {
  if (reducedMotion.matches) {
    titleLines.forEach((line) => {
      line.style.transform = 'none';
      line.style.opacity = 1;
    });
    return;
  }

  const driftProgress = easeOutCubic(progress);
  const lineMovements = [-3.2, -1.65, 2.15];

  titleLines.forEach((line, index) => {
    const movement = lineMovements[index] * driftProgress;
    line.style.transform = `translate3d(${movement}vw, 0, 0)`;
    line.style.opacity = 1;
  });
}

function updateStory() {
  if (reducedMotion.matches) return;

  const maxScroll = storySection.offsetHeight - window.innerHeight;
  const rect = storySection.getBoundingClientRect();
  const progress = maxScroll > 0 ? clamp(-rect.top / maxScroll, 0, 1) : 1;
  const easedProgress = progress * progress * (3 - 2 * progress);
  const isMobile = window.innerWidth <= 780;
  const startScale = isMobile ? .7 : .56;
  const finalScale = 1;
  const scaleProgress = easeOutCubic(clamp(progress / .2, 0, 1));
  const currentScale = startScale + (finalScale - startScale) * scaleProgress;
  const pagePadding = clamp(window.innerWidth * .016, 18, 30);
  const navMargin = (document.querySelector('.brand')?.getBoundingClientRect().left || pagePadding) +
    clamp(window.innerWidth * .008, 8, 16);
  const startWidth = window.innerWidth - navMargin * 2;
  const finalWidth = window.innerWidth - navMargin * 2;
  const widthProgress = easeOutCubic(clamp(progress / .34, 0, 1));
  const currentWidth = startWidth + (finalWidth - startWidth) * widthProgress;

  if (Math.abs(currentWidth - lastStoryWidth) > 1) {
    storyCopy.style.width = `${currentWidth}px`;
    lastStoryWidth = currentWidth;
    layoutStoryLines();
  }

  const startY = window.innerHeight * (isMobile ? .54 : .46);
  const endY = Math.min(
    window.innerHeight * .08,
    window.innerHeight - storyCopy.offsetHeight * finalScale - window.innerHeight * .16
  );
  const currentY = startY + (endY - startY) * easedProgress;
  storyCopy.style.setProperty('--story-y', `${currentY}px`);
  storyCopy.style.setProperty('--story-scale', currentScale);

  const readingProgress = clamp((progress - .025) / .95, 0, 1);
  const lineJourney = readingProgress * storyLineCount;

  storyWords.forEach((word) => {
    const lineProgress = clamp(lineJourney - word._storyLine, 0, 1);
    const reveal = clamp(
      (lineProgress - word._storyLineX) / word._storyLineWidth,
      0,
      1
    );
    const gradientPosition = easeOutCubic(reveal) * 118 - 18;
    word.style.setProperty('--word-reveal', `${gradientPosition}%`);
  });
}

function updateScrollVideo() {
  if (!scrollVideoDuration || reducedMotion.matches) return;

  const maxScroll = videoSection.offsetHeight - window.innerHeight;
  const rect = videoSection.getBoundingClientRect();
  const progress = maxScroll > 0 ? clamp(-rect.top / maxScroll, 0, 1) : 0;
  targetVideoTime = progress * Math.max(0, scrollVideoDuration - .04);
  videoProgress.style.width = `${progress * 100}%`;

  if (!scrollVideo.seeking && Math.abs(scrollVideo.currentTime - targetVideoTime) > 1 / 30) {
    scrollVideo.currentTime = targetVideoTime;
  }
}

function updateJoinSection() {
  if (reducedMotion.matches) return;

  joinCards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const cardCenter = rect.top + rect.height * .5;
    const distance = Math.abs(cardCenter - window.innerHeight * .5);
    const proximity = clamp(1 - distance / (window.innerHeight * .48), 0, 1);
    const focus = proximity * proximity * (3 - 2 * proximity);
    const depth = -650 * (1 - focus);
    const scale = .58 + focus * .42;
    const lineProgress = easeOutCubic(clamp(
      (window.innerHeight * .96 - rect.top) / (window.innerHeight * .48),
      0,
      1
    ));

    const body = card.querySelector('.join-card__body');
    body.style.opacity = .12 + focus * .88;
    body.style.transform = `perspective(1400px) translate3d(0, 0, ${depth}px) scale(${scale})`;
    card.style.setProperty('--line-progress', lineProgress);
    card.style.zIndex = Math.round(focus * 10);
  });
}

function updateScrollGallery() {
  if (!gallerySection || !galleryCards.length) return;

  const maxScroll = gallerySection.offsetHeight - window.innerHeight;
  const rect = gallerySection.getBoundingClientRect();
  const sectionProgress = maxScroll > 0 ? clamp(-rect.top / maxScroll, 0, 1) : 0;
  const galleryProgress = sectionProgress * (galleryCards.length - 1);
  const cardWidth = galleryCards[0].offsetWidth;
  const pagePadding = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--page-padding')) || 24;

  galleryCards.forEach((card, index) => {
    const relative = index - galleryProgress;
    const distance = Math.abs(relative);
    const future = relative >= 0;
    const scale = future
      ? Math.max(.34, 1 / (1 + relative * .58))
      : Math.max(.48, 1 + relative * .38);
    const x = future
      ? pagePadding + cardWidth * (1 - Math.exp(-relative * .8)) * 1.22
      : pagePadding + relative * cardWidth * 1.08;
    const captionFocus = clamp(1 - distance / .42, 0, 1);
    const visibility = relative < -1.25 || relative > 6.2 ? 0 : 1;

    card.style.opacity = visibility;
    card.style.zIndex = Math.max(1, Math.round(100 - distance * 12));
    card.style.transform = `translate3d(${x}px, 0, 0) scale(${scale})`;
    card.style.setProperty('--caption-opacity', captionFocus.toFixed(3));
    card.style.pointerEvents = captionFocus > .75 ? 'auto' : 'none';
  });
}

scene.addEventListener('pointermove', (event) => {
  const rect = scene.getBoundingClientRect();
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
  pointer.active = true;
});

scene.addEventListener('pointerleave', () => {
  pointer.active = false;
});

window.addEventListener('resize', layoutStars);
window.addEventListener('resize', layoutStoryLines);

if (document.fonts?.ready) {
  document.fonts.ready.then(() => {
    layoutStars();
    layoutStoryLines();
  });
}

const startTime = performance.now();

function animate(now) {
  const time = (now - startTime) / 1000;
  const progress = getScrollProgress();
  progressBar.style.width = `${progress * 100}%`;
  updateSectionNavigation();
  updateNavigationContrast();
  updateAsteriskTitle(progress);
  updateStory();
  updateScrollVideo();
  updateJoinSection();
  updateScrollGallery();

  stars.forEach((star) => {
    const localProgress = clamp(
      (progress - star.revealAt * 0.84) / config.revealWindow,
      0,
      1
    );

    const reveal = easeOutCubic(localProgress);

    let targetX = star.baseX + Math.sin(time * 0.75 + star.phase) * 1.2;
    let targetY = star.baseY + Math.cos(time * 0.62 + star.phase) * 0.9;

    if (pointer.active && reveal > 0.02) {
      const dx = pointer.x - star.x;
      const dy = pointer.y - star.y;
      const distance = Math.hypot(dx, dy) || 1;

      if (distance < config.mouseRadius) {
        const influence = 1 - distance / config.mouseRadius;
        const strength = influence * influence * config.mouseSensitivity;
        targetX += dx * strength;
        targetY += dy * strength;
      }
    }

    stars.forEach((other) => {
      if (other === star || other.x === 0 || other.y === 0) return;

      const dx = star.x - other.x;
      const dy = star.y - other.y;
      const overlapX = (star.width + other.width) * .5 + 6 - Math.abs(dx);
      const overlapY = (star.height + other.height) * .5 + 5 - Math.abs(dy);

      if (overlapX <= 0 || overlapY <= 0) return;

      if (overlapX < overlapY) {
        targetX += overlapX * .16 * (dx >= 0 ? 1 : -1);
      } else {
        targetY += overlapY * .16 * (dy >= 0 ? 1 : -1);
      }
    });

    const protectedTarget = pushOutsideSafeZone(targetX, targetY, 18);
    targetX = protectedTarget.x;
    targetY = protectedTarget.y;

    star.vx += (targetX - star.x) * config.spring;
    star.vy += (targetY - star.y) * config.spring;
    star.vx *= config.damping;
    star.vy *= config.damping;
    star.x += star.vx;
    star.y += star.vy;

    const protectedPosition = pushOutsideSafeZone(star.x, star.y, 8);

    if (protectedPosition.x !== star.x) {
      star.x = protectedPosition.x;
      star.vx *= 0.25;
    }

    if (protectedPosition.y !== star.y) {
      star.y = protectedPosition.y;
      star.vy *= 0.25;
    }

    const entranceY = (1 - reveal) * 14;
    const scale = 0.82 + reveal * 0.18;

    star.el.style.opacity = reveal;
    star.el.style.transform = `translate3d(${star.x}px, ${star.y + entranceY}px, 0) translate(-50%, -50%) scale(${scale})`;
  });

  requestAnimationFrame(animate);
}

layoutStars();
requestAnimationFrame(animate);
