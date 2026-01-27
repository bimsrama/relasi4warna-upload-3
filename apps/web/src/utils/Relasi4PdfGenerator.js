/**
 * RELASI4™ Enhanced PDF Generator
 * Multi-chapter PDF export with professional styling
 */

import jsPDF from 'jspdf';

// Color palette
const COLORS = {
  color_red: { hex: '#C05640', rgb: [192, 86, 64], name: 'Merah', archetype: 'Driver' },
  color_yellow: { hex: '#D99E30', rgb: [217, 158, 48], name: 'Kuning', archetype: 'Spark' },
  color_green: { hex: '#5D8A66', rgb: [93, 138, 102], name: 'Hijau', archetype: 'Anchor' },
  color_blue: { hex: '#5B8FA8', rgb: [91, 143, 168], name: 'Biru', archetype: 'Analyst' }
};

const BRAND = {
  primary: [74, 59, 50],      // Dark brown
  secondary: [122, 110, 98],  // Light brown
  accent: [217, 158, 48],     // Gold
  background: [250, 248, 245] // Cream
};

class Relasi4PdfGenerator {
  constructor() {
    this.pdf = null;
    this.pageWidth = 210;
    this.pageHeight = 297;
    this.margin = 20;
    this.contentWidth = this.pageWidth - (this.margin * 2);
    this.currentY = this.margin;
    this.pageNumber = 0;
    this.chapters = [];
  }

  // Initialize new PDF document
  init(title = 'RELASI4™ Report') {
    this.pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    this.title = title;
    this.pageNumber = 0;
    this.chapters = [];
    this.currentY = this.margin;
    return this;
  }

  // Add page with header/footer
  addPage() {
    if (this.pageNumber > 0) {
      this.pdf.addPage();
    }
    this.pageNumber++;
    this.currentY = this.margin + 10;
    this.addHeader();
    this.addFooter();
  }

  // Header
  addHeader() {
    this.pdf.setFillColor(...BRAND.primary);
    this.pdf.rect(0, 0, this.pageWidth, 8, 'F');
    
    this.pdf.setFontSize(8);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.text('RELASI4™', this.margin, 5);
    
    this.pdf.setTextColor(...BRAND.secondary);
    this.pdf.text(this.title, this.pageWidth - this.margin, 5, { align: 'right' });
  }

  // Footer with page number
  addFooter() {
    const footerY = this.pageHeight - 10;
    
    this.pdf.setDrawColor(...BRAND.secondary);
    this.pdf.line(this.margin, footerY - 3, this.pageWidth - this.margin, footerY - 3);
    
    this.pdf.setFontSize(8);
    this.pdf.setTextColor(...BRAND.secondary);
    this.pdf.text(`Halaman ${this.pageNumber}`, this.pageWidth / 2, footerY, { align: 'center' });
    this.pdf.text('relasi4warna.com', this.pageWidth - this.margin, footerY, { align: 'right' });
  }

  // Cover page
  addCoverPage(data) {
    this.addPage();
    
    const centerX = this.pageWidth / 2;
    const primaryColor = COLORS[data.primaryColor] || COLORS.color_red;
    const secondaryColor = COLORS[data.secondaryColor] || COLORS.color_yellow;
    
    // Background gradient simulation
    this.pdf.setFillColor(...primaryColor.rgb);
    this.pdf.rect(0, 40, this.pageWidth, 80, 'F');
    
    // Title
    this.pdf.setFontSize(32);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.text('RELASI4™', centerX, 70, { align: 'center' });
    
    this.pdf.setFontSize(14);
    this.pdf.text('Personality Assessment Report', centerX, 82, { align: 'center' });
    
    // Archetype circle
    this.pdf.setFillColor(255, 255, 255);
    this.pdf.circle(centerX, 150, 35, 'F');
    
    this.pdf.setFillColor(...primaryColor.rgb);
    this.pdf.circle(centerX, 150, 30, 'F');
    
    this.pdf.setFontSize(24);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.text(primaryColor.archetype.charAt(0), centerX, 155, { align: 'center' });
    
    // Archetype name
    this.pdf.setFontSize(28);
    this.pdf.setTextColor(...BRAND.primary);
    this.pdf.text(primaryColor.archetype, centerX, 200, { align: 'center' });
    
    // Secondary archetype
    this.pdf.setFontSize(14);
    this.pdf.setTextColor(...BRAND.secondary);
    this.pdf.text(`dengan sentuhan ${secondaryColor.archetype}`, centerX, 212, { align: 'center' });
    
    // Name & date
    if (data.name) {
      this.pdf.setFontSize(16);
      this.pdf.setTextColor(...BRAND.primary);
      this.pdf.text(data.name, centerX, 240, { align: 'center' });
    }
    
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(...BRAND.secondary);
    this.pdf.text(`Dibuat: ${new Date().toLocaleDateString('id-ID', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    })}`, centerX, 252, { align: 'center' });
    
    return this;
  }

  // Couple cover page
  addCoupleCoverPage(data) {
    this.addPage();
    
    const centerX = this.pageWidth / 2;
    const colorA = COLORS[data.personA?.primaryColor] || COLORS.color_red;
    const colorB = COLORS[data.personB?.primaryColor] || COLORS.color_yellow;
    
    // Gradient background
    this.pdf.setFillColor(...colorA.rgb);
    this.pdf.rect(0, 40, this.pageWidth / 2, 80, 'F');
    this.pdf.setFillColor(...colorB.rgb);
    this.pdf.rect(this.pageWidth / 2, 40, this.pageWidth / 2, 80, 'F');
    
    // Title
    this.pdf.setFontSize(28);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.text('RELASI4™', centerX, 65, { align: 'center' });
    
    this.pdf.setFontSize(14);
    this.pdf.text('Couple Compatibility Report', centerX, 80, { align: 'center' });
    
    // Person circles
    this.pdf.setFillColor(255, 255, 255);
    this.pdf.circle(centerX - 45, 150, 30, 'F');
    this.pdf.circle(centerX + 45, 150, 30, 'F');
    
    this.pdf.setFillColor(...colorA.rgb);
    this.pdf.circle(centerX - 45, 150, 25, 'F');
    
    this.pdf.setFillColor(...colorB.rgb);
    this.pdf.circle(centerX + 45, 150, 25, 'F');
    
    // Initials
    this.pdf.setFontSize(20);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.text(colorA.archetype.charAt(0), centerX - 45, 155, { align: 'center' });
    this.pdf.text(colorB.archetype.charAt(0), centerX + 45, 155, { align: 'center' });
    
    // Heart
    this.pdf.setFontSize(24);
    this.pdf.setTextColor(233, 30, 99);
    this.pdf.text('♥', centerX, 155, { align: 'center' });
    
    // Compatibility score
    const score = data.compatibilityScore || 0;
    this.pdf.setFillColor(score >= 70 ? 34 : score >= 40 ? 245 : 239, 
                          score >= 70 ? 197 : score >= 40 ? 158 : 68, 
                          score >= 70 ? 94 : score >= 40 ? 11 : 68);
    this.pdf.circle(centerX, 210, 25, 'F');
    
    this.pdf.setFontSize(22);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.text(`${score}%`, centerX, 215, { align: 'center' });
    
    // Names
    this.pdf.setFontSize(14);
    this.pdf.setTextColor(...BRAND.primary);
    this.pdf.text(`${colorA.archetype} + ${colorB.archetype}`, centerX, 250, { align: 'center' });
    
    // Date
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(...BRAND.secondary);
    this.pdf.text(`Dibuat: ${new Date().toLocaleDateString('id-ID', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    })}`, centerX, 265, { align: 'center' });
    
    return this;
  }

  // Table of Contents
  addTableOfContents() {
    this.addPage();
    
    this.pdf.setFontSize(24);
    this.pdf.setTextColor(...BRAND.primary);
    this.pdf.text('Daftar Isi', this.margin, this.currentY);
    this.currentY += 15;
    
    this.pdf.setDrawColor(...BRAND.secondary);
    this.pdf.line(this.margin, this.currentY, this.margin + 50, this.currentY);
    this.currentY += 15;
    
    const tocItems = [
      { title: 'Profil Kepribadian', page: 3 },
      { title: 'Kekuatan & Kelemahan', page: 4 },
      { title: 'Dinamika Relasi', page: 5 },
      { title: 'Tips Praktis', page: 6 }
    ];
    
    tocItems.forEach((item, index) => {
      this.pdf.setFontSize(12);
      this.pdf.setTextColor(...BRAND.primary);
      this.pdf.text(`${index + 1}. ${item.title}`, this.margin, this.currentY);
      
      // Dotted line
      this.pdf.setDrawColor(...BRAND.secondary);
      const textWidth = this.pdf.getTextWidth(`${index + 1}. ${item.title}`);
      const dotsStart = this.margin + textWidth + 5;
      const dotsEnd = this.pageWidth - this.margin - 15;
      
      for (let x = dotsStart; x < dotsEnd; x += 3) {
        this.pdf.circle(x, this.currentY - 1, 0.3, 'F');
      }
      
      this.pdf.text(`${item.page}`, this.pageWidth - this.margin, this.currentY, { align: 'right' });
      this.currentY += 10;
    });
    
    return this;
  }

  // Chapter header
  addChapterHeader(number, title, color = BRAND.primary) {
    if (this.currentY > this.pageHeight - 60) {
      this.addPage();
    }
    
    // Chapter number badge
    this.pdf.setFillColor(...color);
    this.pdf.roundedRect(this.margin, this.currentY - 5, 30, 12, 3, 3, 'F');
    
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.text(`BAB ${number}`, this.margin + 15, this.currentY + 2, { align: 'center' });
    
    // Title
    this.pdf.setFontSize(20);
    this.pdf.setTextColor(...BRAND.primary);
    this.pdf.text(title, this.margin, this.currentY + 20);
    
    // Underline
    this.pdf.setDrawColor(...color);
    this.pdf.setLineWidth(1);
    this.pdf.line(this.margin, this.currentY + 25, this.margin + 60, this.currentY + 25);
    this.pdf.setLineWidth(0.2);
    
    this.currentY += 35;
    this.chapters.push({ number, title, page: this.pageNumber });
    
    return this;
  }

  // Add section
  addSection(title, content) {
    if (this.currentY > this.pageHeight - 40) {
      this.addPage();
    }
    
    // Section title
    this.pdf.setFontSize(14);
    this.pdf.setTextColor(...BRAND.primary);
    this.pdf.text(title, this.margin, this.currentY);
    this.currentY += 8;
    
    // Content
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(...BRAND.secondary);
    
    const lines = this.pdf.splitTextToSize(content, this.contentWidth);
    lines.forEach(line => {
      if (this.currentY > this.pageHeight - 20) {
        this.addPage();
      }
      this.pdf.text(line, this.margin, this.currentY);
      this.currentY += 5;
    });
    
    this.currentY += 8;
    return this;
  }

  // Add bullet list
  addBulletList(items, bulletColor = BRAND.accent) {
    items.forEach(item => {
      if (this.currentY > this.pageHeight - 20) {
        this.addPage();
      }
      
      // Bullet
      this.pdf.setFillColor(...bulletColor);
      this.pdf.circle(this.margin + 2, this.currentY - 1.5, 1.5, 'F');
      
      // Text
      this.pdf.setFontSize(10);
      this.pdf.setTextColor(...BRAND.primary);
      
      const lines = this.pdf.splitTextToSize(item, this.contentWidth - 10);
      lines.forEach((line, i) => {
        this.pdf.text(line, this.margin + 8, this.currentY + (i * 5));
      });
      
      this.currentY += lines.length * 5 + 3;
    });
    
    this.currentY += 5;
    return this;
  }

  // Add color score bar
  addColorScoreBar(colorKey, score, maxScore = 20) {
    const color = COLORS[colorKey];
    if (!color) return this;
    
    if (this.currentY > this.pageHeight - 25) {
      this.addPage();
    }
    
    const barWidth = 100;
    const barHeight = 8;
    const fillWidth = (score / maxScore) * barWidth;
    
    // Label
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(...BRAND.primary);
    this.pdf.text(`${color.archetype} (${color.name})`, this.margin, this.currentY);
    
    // Background bar
    this.pdf.setFillColor(230, 230, 230);
    this.pdf.roundedRect(this.margin + 55, this.currentY - 5, barWidth, barHeight, 2, 2, 'F');
    
    // Fill bar
    this.pdf.setFillColor(...color.rgb);
    this.pdf.roundedRect(this.margin + 55, this.currentY - 5, fillWidth, barHeight, 2, 2, 'F');
    
    // Score
    this.pdf.setTextColor(...BRAND.secondary);
    this.pdf.text(`${score}`, this.margin + 160, this.currentY, { align: 'right' });
    
    this.currentY += 12;
    return this;
  }

  // Add compatibility meter (for couple reports)
  addCompatibilityMeter(score) {
    const centerX = this.pageWidth / 2;
    
    // Background circle
    this.pdf.setFillColor(240, 240, 240);
    this.pdf.circle(centerX, this.currentY + 30, 35, 'F');
    
    // Score circle
    const scoreColor = score >= 70 ? [34, 197, 94] : score >= 40 ? [245, 158, 11] : [239, 68, 68];
    this.pdf.setFillColor(...scoreColor);
    this.pdf.circle(centerX, this.currentY + 30, 30, 'F');
    
    // Score text
    this.pdf.setFontSize(24);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.text(`${score}%`, centerX, this.currentY + 35, { align: 'center' });
    
    // Label
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(...BRAND.secondary);
    this.pdf.text('Kompatibilitas', centerX, this.currentY + 75, { align: 'center' });
    
    this.currentY += 85;
    return this;
  }

  // Generate Single Report PDF
  generateSingleReport(report) {
    this.init('Laporan Kepribadian');
    
    const profile = report.profile || {};
    const strengths = report.strengths || [];
    const weaknesses = report.weaknesses || [];
    const tips = report.practical_tips || [];
    const relationshipDynamics = report.relationship_dynamics || {};
    
    // Cover
    this.addCoverPage({
      primaryColor: profile.primary_color,
      secondaryColor: profile.secondary_color,
      name: report.user_name
    });
    
    // Table of Contents
    this.addTableOfContents();
    
    // Chapter 1: Profile
    this.addPage();
    this.addChapterHeader(1, 'Profil Kepribadian', COLORS[profile.primary_color]?.rgb || BRAND.primary);
    
    if (profile.summary) {
      this.addSection('Ringkasan', profile.summary);
    }
    
    // Color scores
    this.addSection('Skor Warna', '');
    const colorScores = report.scores?.color_scores || {};
    Object.entries(colorScores).forEach(([color, score]) => {
      this.addColorScoreBar(color, score);
    });
    
    // Chapter 2: Strengths & Weaknesses
    this.addPage();
    this.addChapterHeader(2, 'Kekuatan & Kelemahan', [93, 138, 102]);
    
    if (strengths.length > 0) {
      this.addSection('Kekuatan Utama', '');
      this.addBulletList(strengths.map(s => typeof s === 'string' ? s : s.description || s.title), [34, 197, 94]);
    }
    
    if (weaknesses.length > 0) {
      this.addSection('Area Pengembangan', '');
      this.addBulletList(weaknesses.map(w => typeof w === 'string' ? w : w.description || w.title), [239, 68, 68]);
    }
    
    // Chapter 3: Relationship Dynamics
    this.addPage();
    this.addChapterHeader(3, 'Dinamika Relasi', [91, 143, 168]);
    
    if (relationshipDynamics.communication_style) {
      this.addSection('Gaya Komunikasi', relationshipDynamics.communication_style);
    }
    if (relationshipDynamics.conflict_handling) {
      this.addSection('Penanganan Konflik', relationshipDynamics.conflict_handling);
    }
    if (relationshipDynamics.emotional_needs) {
      this.addSection('Kebutuhan Emosional', relationshipDynamics.emotional_needs);
    }
    
    // Chapter 4: Tips
    this.addPage();
    this.addChapterHeader(4, 'Tips Praktis', [217, 158, 48]);
    
    if (tips.length > 0) {
      tips.forEach((tip, index) => {
        const tipText = typeof tip === 'string' ? tip : tip.description || tip.title;
        this.addSection(`Tip ${index + 1}`, tipText);
      });
    }
    
    return this.pdf;
  }

  // Generate Couple Report PDF
  generateCoupleReport(report) {
    this.init('Laporan Kompatibilitas');
    
    const compatibility = report.compatibility_summary || {};
    const personA = report.person_a_profile || {};
    const personB = report.person_b_profile || {};
    const sharedStrengths = report.shared_strengths || [];
    const frictionAreas = report.friction_areas || [];
    const tips = report.practical_tips || [];
    
    // Cover
    this.addCoupleCoverPage({
      personA: { primaryColor: personA.primary_color },
      personB: { primaryColor: personB.primary_color },
      compatibilityScore: compatibility.compatibility_score
    });
    
    // Chapter 1: Compatibility Overview
    this.addPage();
    this.addChapterHeader(1, 'Ringkasan Kompatibilitas', [233, 30, 99]);
    
    this.addCompatibilityMeter(compatibility.compatibility_score || 0);
    
    if (compatibility.headline) {
      this.addSection('Headline', compatibility.headline);
    }
    if (compatibility.overview) {
      this.addSection('Overview', compatibility.overview);
    }
    
    // Chapter 2: Profile Comparison
    this.addPage();
    this.addChapterHeader(2, 'Perbandingan Profil', [91, 143, 168]);
    
    const colorA = COLORS[personA.primary_color] || COLORS.color_red;
    const colorB = COLORS[personB.primary_color] || COLORS.color_yellow;
    
    this.addSection(`Person A: ${colorA.archetype}`, personA.summary || '');
    this.addSection(`Person B: ${colorB.archetype}`, personB.summary || '');
    
    // Chapter 3: Shared Strengths
    this.addPage();
    this.addChapterHeader(3, 'Kekuatan Bersama', [34, 197, 94]);
    
    if (sharedStrengths.length > 0) {
      this.addBulletList(
        sharedStrengths.map(s => typeof s === 'string' ? s : `${s.title}: ${s.description}`),
        [34, 197, 94]
      );
    }
    
    // Chapter 4: Friction Areas
    this.addPage();
    this.addChapterHeader(4, 'Area Gesekan', [239, 68, 68]);
    
    if (frictionAreas.length > 0) {
      frictionAreas.forEach((area, index) => {
        const title = typeof area === 'string' ? `Area ${index + 1}` : area.title;
        const desc = typeof area === 'string' ? area : area.description;
        this.addSection(title, desc);
        if (area.resolution_tip) {
          this.pdf.setTextColor(34, 197, 94);
          this.pdf.setFontSize(9);
          this.pdf.text(`💡 ${area.resolution_tip}`, this.margin + 5, this.currentY);
          this.currentY += 10;
        }
      });
    }
    
    // Chapter 5: Practical Tips
    this.addPage();
    this.addChapterHeader(5, 'Tips Praktis', [217, 158, 48]);
    
    if (tips.length > 0) {
      tips.forEach((tip, index) => {
        const tipText = typeof tip === 'string' ? tip : tip.description || tip.tip;
        this.addSection(`Tip ${index + 1}`, tipText);
      });
    }
    
    return this.pdf;
  }

  // Generate Family Report PDF
  generateFamilyReport(report) {
    this.init('Laporan Dinamika Keluarga');
    
    const familySummary = report.family_summary || {};
    const members = report.member_profiles || [];
    const roleAnalysis = report.role_analysis || [];
    const strengthsMatrix = report.strengths_matrix || [];
    const frictionPoints = report.friction_points || [];
    const exercises = report.family_exercises || [];
    
    // Cover
    this.addPage();
    
    const centerX = this.pageWidth / 2;
    
    // Green gradient background
    this.pdf.setFillColor(93, 138, 102);
    this.pdf.rect(0, 40, this.pageWidth, 80, 'F');
    
    // Title
    this.pdf.setFontSize(28);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.text('RELASI4™', centerX, 65, { align: 'center' });
    
    this.pdf.setFontSize(14);
    this.pdf.text('Family Dynamics Report', centerX, 80, { align: 'center' });
    
    // Family name
    this.pdf.setFontSize(20);
    this.pdf.setTextColor(...BRAND.primary);
    this.pdf.text(report.family_name || 'Keluarga Kita', centerX, 150, { align: 'center' });
    
    // Member circles
    const memberCount = Math.min(members.length, 6);
    const startX = centerX - (memberCount * 15);
    members.slice(0, 6).forEach((member, i) => {
      const color = COLORS[member.primary_color] || COLORS.color_green;
      this.pdf.setFillColor(...color.rgb);
      this.pdf.circle(startX + (i * 30), 180, 12, 'F');
    });
    
    // Harmony score
    const score = familySummary.harmony_score || 0;
    this.pdf.setFillColor(score >= 70 ? 34 : score >= 40 ? 245 : 239, 
                          score >= 70 ? 197 : score >= 40 ? 158 : 68, 
                          score >= 70 ? 94 : score >= 40 ? 11 : 68);
    this.pdf.circle(centerX, 230, 25, 'F');
    
    this.pdf.setFontSize(20);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.text(`${score}%`, centerX, 235, { align: 'center' });
    
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(...BRAND.secondary);
    this.pdf.text('Harmoni Keluarga', centerX, 265, { align: 'center' });
    
    // Chapter 1: Family Overview
    this.addPage();
    this.addChapterHeader(1, 'Ringkasan Keluarga', [93, 138, 102]);
    
    if (familySummary.headline) {
      this.addSection('Headline', familySummary.headline);
    }
    if (familySummary.overview) {
      this.addSection('Overview', familySummary.overview);
    }
    
    this.addSection('Anggota Keluarga', `${members.length} anggota dengan berbagai tipe kepribadian`);
    
    // Chapter 2: Role Analysis
    this.addPage();
    this.addChapterHeader(2, 'Analisis Peran', [91, 143, 168]);
    
    roleAnalysis.forEach(role => {
      const color = COLORS[role.primary_color] || COLORS.color_green;
      this.addSection(`${role.member_name} - ${role.role_title}`, role.role_description || '');
    });
    
    // Chapter 3: Collective Strengths
    this.addPage();
    this.addChapterHeader(3, 'Kekuatan Kolektif', [34, 197, 94]);
    
    if (strengthsMatrix.length > 0) {
      strengthsMatrix.forEach(strength => {
        this.addSection(strength.strength_title || 'Kekuatan', strength.how_it_helps || '');
      });
    }
    
    // Chapter 4: Friction Points
    if (frictionPoints.length > 0) {
      this.addPage();
      this.addChapterHeader(4, 'Titik Gesekan', [239, 68, 68]);
      
      frictionPoints.forEach(friction => {
        const between = friction.between_members?.join(' & ') || '';
        this.addSection(`${between}`, friction.friction_description || '');
        if (friction.resolution_tip) {
          this.pdf.setTextColor(34, 197, 94);
          this.pdf.setFontSize(9);
          this.pdf.text(`💡 ${friction.resolution_tip}`, this.margin + 5, this.currentY);
          this.currentY += 10;
        }
      });
    }
    
    // Chapter 5: Family Exercises
    if (exercises.length > 0) {
      this.addPage();
      this.addChapterHeader(5, 'Aktivitas Keluarga', [217, 158, 48]);
      
      exercises.forEach((exercise, index) => {
        this.addSection(`${index + 1}. ${exercise.exercise_title}`, exercise.instructions || '');
      });
    }
    
    return this.pdf;
  }

  // Save PDF
  save(filename) {
    if (this.pdf) {
      this.pdf.save(filename);
    }
  }

  // Get PDF as blob
  getBlob() {
    if (this.pdf) {
      return this.pdf.output('blob');
    }
    return null;
  }
}

export default Relasi4PdfGenerator;
