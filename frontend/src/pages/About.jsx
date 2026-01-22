import React from 'react';
import { motion } from 'framer-motion';
import { Target, Users, Lightbulb, Heart, Github, Linkedin, Mail } from 'lucide-react';
import Card from '@/components/Card';
import PageTransition from '@/components/PageTransition';
import saneha from '../../public/download.png';
import zainab from '../../public/dd.jpg';
import faiqa from '../../public/ddd.jpg';
import aqsa from '../../public/dddd.jpg';

const About = () => {
  const team = [
    {
      name: 'Saneha Siddique',
      role: 'Project Lead & Backend Developer',
      image: saneha,
    },
    {
      name: 'Zainab Khalid',
      role: 'AI Engineer',
      image: zainab,
    },
    {
      name: 'Faiqa Mustafa',
      role: 'Frontend Developer',
      image: faiqa,
    },
    {
      name: 'Aqsa Hussain',
      role: 'Chatbot Specialist',
      image: aqsa,
    },
  ];

  const values = [
    {
      icon: Target,
      title: 'Our Mission',
      description:
        'To simplify document processing and form-filling through intelligent AI, making bureaucratic tasks effortless for everyone.',
    },
    {
      icon: Lightbulb,
      title: 'Our Vision',
      description:
        'A world where paperwork no longer hinders productivity, where forms complete themselves, and where AI serves humanity.',
    },
    {
      icon: Heart,
      title: 'Our Values',
      description:
        'Innovation, user-centricity, privacy-first approach, and continuous improvement drive everything we build.',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

  return (
    <PageTransition>
      <div className="min-h-screen pt-24 pb-12">
        {/* Hero */}
        <section className="relative py-16 overflow-hidden">
          <div className="floating-shape w-64 h-64 bg-asaan-sky top-0 right-0" />
          <div
            className="floating-shape w-48 h-48 bg-asaan-steel bottom-0 left-20"
            style={{ animationDelay: '-7s' }}
          />

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-3xl mx-auto"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-asaan-sky/20 border border-asaan-sky/30 text-asaan-royal text-sm font-medium mb-6">
                <Users className="w-4 h-4" />
                About Us
              </span>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Building the Future of <span className="gradient-text">Form Automation</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                ASAAN FORM is a Final Year Project aimed at revolutionizing how people interact
                with forms and documents using the power of Artificial Intelligence.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Mission, Vision, Values */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {values.map((value) => {
                const Icon = value.icon;
                return (
                  <motion.div key={value.title} variants={itemVariants}>
                    <Card variant="glass" className="h-full text-center">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-asaan-sky to-asaan-royal flex items-center justify-center mx-auto mb-6">
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="font-display text-xl font-semibold mb-3">{value.title}</h3>
                      <p className="text-muted-foreground text-sm">{value.description}</p>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* Project Story */}
        <section className="py-16 bg-gradient-to-b from-asaan-sky/10 to-transparent">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-8">
                The Story Behind <span className="gradient-text">ASAAN FORM</span>
              </h2>
              <div className="text-left space-y-6 text-muted-foreground">
                <p>
                  The idea for ASAAN FORM was born from a simple observation: filling out forms is
                  one of the most tedious, time-consuming tasks that everyone dreads. From university
                  applications to government documents, the process remains largely manual and error-prone.
                </p>
                <p>
                  As final year computer science students, we asked ourselves: "What if AI could
                  understand forms just like humans do, but fill them out instantly and accurately?"
                  This question sparked the journey that led to ASAAN FORM.
                </p>
                <p>
                  Our solution leverages cutting-edge AI technologies including computer vision for
                  document analysis, natural language processing for understanding form fields, and
                  intelligent data extraction to auto-populate forms with user information.
                </p>
                <p>
                  The name "ASAAN" means "easy" in Urdu, perfectly capturing our mission: making
                  form-filling easy for everyone, regardless of their technical expertise.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Team Section */}
        <section id="team" className="py-16">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Meet Our <span className="gradient-text">Team</span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                The passionate individuals behind ASAAN FORM.
              </p>
            </motion.div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {team.map((member) => (
                <motion.div key={member.name} variants={itemVariants}>
                  <Card variant="glass" className="text-center">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 ring-4 ring-asaan-sky/30"
                    >
                      <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                    </motion.div>
                    <h3 className="font-display text-lg font-semibold">{member.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{member.role}</p>
                    <div className="flex justify-center gap-3">
                      {[Github, Linkedin, Mail].map((Icon, index) => (
                        <motion.a
                          key={index}
                          href="#"
                          whileHover={{ scale: 1.1, y: -2 }}
                          whileTap={{ scale: 0.9 }}
                          className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Icon className="w-4 h-4" />
                        </motion.a>
                      ))}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-16">
          <div className="max-w-2xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card variant="glass" glow className="text-center p-8">
                <h2 className="font-display text-2xl font-bold mb-4">Get in Touch</h2>
                <p className="text-muted-foreground mb-6">
                  Have questions or feedback? We'd love to hear from you!
                </p>
                <a
                  href="mailto:contact@asaanform.com"
                  className="inline-flex items-center gap-2 text-asaan-royal hover:underline"
                >
                  <Mail className="w-5 h-5" />
                  asaanform@gmail.com
                </a>
              </Card>
            </motion.div>
          </div>
        </section>
      </div>
    </PageTransition>
  );
};

export default About;
