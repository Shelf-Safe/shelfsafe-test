document.addEventListener('DOMContentLoaded', function () {
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
    });

    mobileNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => mobileNav.classList.remove('open'));
    });
  }

  const items = document.querySelectorAll('.accordion-item');

  items.forEach(item => {
    const trigger = item.querySelector('.accordion-trigger');

    trigger.addEventListener('click', () => {
      // Close all other items
      items.forEach(i => {
        if (i !== item) i.classList.remove('active');
      });

      // Toggle current one
      item.classList.toggle('active');
    });
  });

  const form = document.querySelector('.contact-form');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      alert('Thanks! Your message has been captured for the demo landing page.');
    });
  }
});
  