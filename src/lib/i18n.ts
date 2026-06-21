import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      app: { name: "OdooCafé POS" },
      nav: {
        pos: "POS",
        tables: "Tables",
        menu: "Menu",
        inventory: "Inventory",
        cashdrawer: "Cash Drawer",
        audit: "Audit Log",
        display: "Customer Display",
        tracker: "Order Tracker",
        settings: "Settings",
        signout: "Sign out",
      },
      pos: {
        newOrder: "New order",
        cart: "Cart",
        empty: "No items yet — tap a menu item",
        subtotal: "Subtotal",
        discount: "Discount",
        tax: "Tax",
        tip: "Tip",
        total: "Total",
        pay: "Pay",
        split: "Split bill",
        print: "Print receipt",
        email: "Email receipt",
        void: "Void",
      },
      auth: {
        signin: "Sign in",
        pin: "Enter PIN",
        twofactor: "Enter 2FA code",
        forgot: "Forgot password",
        reset: "Reset password",
      },
    },
  },
  es: {
    translation: {
      app: { name: "OdooCafé POS" },
      nav: {
        pos: "TPV",
        tables: "Mesas",
        menu: "Menú",
        inventory: "Inventario",
        cashdrawer: "Caja",
        audit: "Auditoría",
        display: "Pantalla cliente",
        tracker: "Rastreador",
        settings: "Ajustes",
        signout: "Salir",
      },
      pos: {
        newOrder: "Nueva orden",
        cart: "Carrito",
        empty: "Sin artÃ­culos — toca un plato",
        subtotal: "Subtotal",
        discount: "Descuento",
        tax: "Impuesto",
        tip: "Propina",
        total: "Total",
        pay: "Pagar",
        split: "Dividir cuenta",
        print: "Imprimir recibo",
        email: "Enviar recibo",
        void: "Anular",
      },
      auth: {
        signin: "Iniciar sesiÃ³n",
        pin: "PIN",
        twofactor: "CÃ³digo 2FA",
        forgot: "OlvidÃ© mi contraseÃ±a",
        reset: "Restablecer",
      },
    },
  },
  fr: {
    translation: {
      app: { name: "OdooCafé POS" },
      nav: {
        pos: "Caisse",
        tables: "Tables",
        menu: "Menu",
        inventory: "Stock",
        cashdrawer: "Caisse",
        audit: "Audit",
        display: "Écran client",
        tracker: "Suivi commandes",
        settings: "Réglages",
        signout: "Déconnexion",
      },
      pos: {
        newOrder: "Nouvelle commande",
        cart: "Panier",
        empty: "Aucun article — touchez le menu",
        subtotal: "Sous-total",
        discount: "Remise",
        tax: "TVA",
        tip: "Pourboire",
        total: "Total",
        pay: "Payer",
        split: "Partager",
        print: "Imprimer",
        email: "E-mail",
        void: "Annuler",
      },
      auth: {
        signin: "Connexion",
        pin: "PIN",
        twofactor: "Code 2FA",
        forgot: "Mot de passe oubliÃ©",
        reset: "RÃ©initialiser",
      },
    },
  },
} as const;

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

export default i18n;
