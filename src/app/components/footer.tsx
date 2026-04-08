import { Link } from "react-router";
import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import logoGeras from "../../imports/geras.png";

export function Footer() {
  return (
    <footer className="bg-teal-900 text-white py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/">
              <img src={logoGeras} alt="Geras" className="h-12 brightness-0 invert" />
            </Link>
          </div>

          {/* Redes Sociais */}
          <div className="flex items-center gap-4">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#F7C672] transition-colors"
            >
              <Facebook className="w-6 h-6" />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#F7C672] transition-colors"
            >
              <Instagram className="w-6 h-6" />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#F7C672] transition-colors"
            >
              <Linkedin className="w-6 h-6" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#F7C672] transition-colors"
            >
              <Twitter className="w-6 h-6" />
            </a>
          </div>

          {/* Copyright */}
          <div className="text-center md:text-right text-teal-100 text-sm">
            <p>© {new Date().getFullYear()} Geras. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
