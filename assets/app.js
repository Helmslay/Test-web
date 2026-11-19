(function () {
  var menuButton = document.querySelector(".menu-toggle");
  var nav = document.getElementById("main-nav");

  function closeMenu(restoreFocus) {
    if (!menuButton || !nav) return;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Открыть меню");
    nav.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    if (restoreFocus) menuButton.focus();
  }

  if (menuButton && nav) {
    menuButton.addEventListener("click", function () {
      var opened = menuButton.getAttribute("aria-expanded") === "true";
      if (opened) {
        closeMenu(false);
      } else {
        menuButton.setAttribute("aria-expanded", "true");
        menuButton.setAttribute("aria-label", "Закрыть меню");
        nav.classList.add("is-open");
        document.body.classList.add("menu-open");
        var firstLink = nav.querySelector("a");
        if (firstLink && window.matchMedia("(max-width: 720px)").matches) firstLink.focus();
      }
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        closeMenu(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
        closeMenu(true);
      }
    });

    var desktopQuery = window.matchMedia("(min-width: 721px)");
    var handleDesktopChange = function (event) {
      if (event.matches) closeMenu(false);
    };
    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener("change", handleDesktopChange);
    } else if (desktopQuery.addListener) {
      desktopQuery.addListener(handleDesktopChange);
    }
  }

  var chatToggle = document.getElementById("chat-toggle");
  var chatPanel = document.getElementById("chat-panel");

  function setChat(open, restoreFocus) {
    if (!chatToggle || !chatPanel) return;
    chatPanel.classList.toggle("is-open", open);
    chatToggle.setAttribute("aria-expanded", String(open));
    if (restoreFocus) chatToggle.focus();
  }

  if (chatToggle && chatPanel) {
    chatToggle.addEventListener("click", function () {
      var opening = chatToggle.getAttribute("aria-expanded") !== "true";
      setChat(opening, false);
      if (opening) {
        var closeButton = document.getElementById("chat-close");
        if (closeButton) closeButton.focus();
      }
    });

    var chatClose = document.getElementById("chat-close");
    if (chatClose) chatClose.addEventListener("click", function () { setChat(false, true); });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && chatToggle.getAttribute("aria-expanded") === "true") {
        setChat(false, true);
      }
    });
  }

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  var form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var message = document.getElementById("form-message");
      if (message) {
        message.textContent = "Это демонстрационная форма: данные не отправлены и нигде не сохранены.";
      }
      form.reset();
    });
  }
}());
