import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Github, Twitter, Linkedin, Mail } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { name: "Features", path: "/#features" },
      { name: "How it Works", path: "/#how-it-works" },
      { name: "Upload Form", path: "/upload-form" },
    ],
    company: [
      { name: "About", path: "/about" },
      { name: "Team", path: "/about#team" },
      { name: "Contact", path: "/about#contact" },
    ],
    legal: [
      { name: "Privacy Policy", path: "#" },
      { name: "Terms of Service", path: "#" },
    ],
  };

  const socialLinks = [
    { icon: Github, href: "#", label: "GitHub" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Mail, href: "mailto:contact@asaanform.com", label: "Email" },
  ];

  return (
    <footer className="relative mt-auto">
      <div className="absolute inset-0 bg-gradient-to-t from-asaan-royal/5 to-transparent pointer-events-none" />

      <div className="relative glass-card border-t border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Brand */}
            <div className="lg:col-span-2">
              <Link to="/" className="flex items-center gap-3 mb-4">
                <motion.div
                  whileHover={{ rotate: 10 }}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-asaan-sky to-asaan-royal flex items-center justify-center"
                >
                  <FileText className="w-5 h-5 text-white" />
                </motion.div>
                <span className="font-display font-bold text-xl gradient-text">
                  ASAAN FORM
                </span>
              </Link>

              <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-sm">
                Your AI-powered form assistant that makes document processing
                simple, fast, and intelligent. Transform the way you handle
                forms.
              </p>

              <div className="flex gap-3">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <motion.a
                      key={social.label}
                      href={social.href}
                      whileHover={{ scale: 1.1, y: -2 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                      aria-label={social.label}
                    >
                      <Icon className="w-4 h-4" />
                    </motion.a>
                  );
                })}
              </div>
            </div>

            {/* Links */}
            {Object.entries(footerLinks).map(([section, links]) => (
              <div key={section}>
                <h4 className="font-display font-semibold mb-4 capitalize">
                  {section}
                </h4>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link.name}>
                      <Link
                        to={link.path}
                        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom */}
          <div className="mt-12 pt-6 border-t border-border/50">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-muted-foreground text-sm">
                © {currentYear} ASAAN FORM. All rights reserved.
              </p>
              <p className="text-muted-foreground text-sm">
                Made with ❤️ for Final Year Project
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
