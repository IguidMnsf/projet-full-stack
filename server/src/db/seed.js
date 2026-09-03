import bcrypt from 'bcryptjs';
import { all, get, run, now } from './index.js';

const iso = (daysAgo, hour = 10, minute = 0) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString().slice(0, 19).replace('T', ' ');
};

const USERS = [
  { name: 'Dr. Sarah Martin', email: 'sarah.martin@campus.edu', role: 'professor', level: 'M2', lang: 'fr', color: '#6366f1' },
  { name: 'Amine Benali', email: 'amine.benali@campus.edu', role: 'student', level: 'L2', lang: 'ar', color: '#10b981' },
  { name: 'James Carter', email: 'james.carter@campus.edu', role: 'student', level: 'L3', lang: 'en', color: '#f59e0b' },
  { name: 'Léa Dubois', email: 'lea.dubois@campus.edu', role: 'student', level: 'M1', lang: 'fr', color: '#ec4899' },
  { name: 'Nadia Haddad', email: 'admin@campus.edu', role: 'admin', level: 'M2', lang: 'en', color: '#0ea5e9' },
];

// q: [text, explanation, [answers...]] — first answer is always the correct one,
// positions get shuffled at seed time so it doesn't look mechanical.
const QUIZZES = [
  {
    title: 'Algorithmes et structures de données',
    description:
      'Testez vos connaissances fondamentales : complexité, structures de données classiques et algorithmes de référence au programme de L2 informatique.',
    subject: 'Informatique', level: 'L2', lang: 'fr', duration: 20, ai: 0, author: 0, daysAgo: 12,
    questions: [
      ["Quelle est la complexité temporelle moyenne d'une recherche dans une table de hachage ?",
        "Une table de hachage associe directement une clé à un emplacement mémoire grâce à la fonction de hachage, ce qui donne un accès en temps constant O(1) en moyenne (O(n) dans le pire cas de collisions extrêmes).",
        ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)']],
      ['Quelle structure de données fonctionne selon le principe LIFO (dernier entré, premier sorti) ?',
        "La pile (stack) suit le principe LIFO : le dernier élément empilé est le premier à être dépilé, comme une pile d'assiettes. La file (queue) fonctionne au contraire en FIFO.",
        ['La pile (stack)', 'La file (queue)', 'La liste chaînée', "L'arbre binaire de recherche"]],
      ['Quelle est la complexité du tri rapide (quicksort) dans le cas moyen ?',
        'Le tri rapide partitionne récursivement le tableau autour d’un pivot : en moyenne chaque partition équilibre le tableau, d’où O(n log n). Le pire cas (pivot toujours extrême) est O(n²).',
        ['O(n log n)', 'O(n²)', 'O(n)', 'O(log n)']],
      ["Quel algorithme trouve le plus court chemin dans un graphe pondéré à poids strictement positifs ?",
        "L'algorithme de Dijkstra explore les sommets par distance croissante depuis la source ; sous condition de poids positifs, il garantit le plus court chemin vers chaque sommet.",
        ["L'algorithme de Dijkstra", 'Le tri par fusion', 'La recherche dichotomique', "L'algorithme de Kruskal"]],
      ['Que fait l’algorithme de recherche dichotomique (binary search) sur un tableau trié ?',
        'À chaque étape, la recherche dichotomique compare la cible à l’élément central et élimine la moitié de l’intervalle restant, ce qui donne une complexité logarithmique O(log n).',
        ["Il divise l'intervalle de recherche en deux à chaque étape", 'Il parcourt le tableau élément par élément', 'Il trie le tableau sur place', 'Il hache chaque valeur pour trouver la cible']],
    ],
  },
  {
    title: 'Bases de données relationnelles',
    description:
      'SQL, modèle relationnel, transactions ACID et normalisation : l’essentiel du cours de L3 à valider avant l’examen.',
    subject: 'Informatique', level: 'L3', lang: 'fr', duration: 15, ai: 0, author: 0, daysAgo: 10,
    questions: [
      ['Que signifie la propriété d’atomicité dans le modèle ACID ?',
        'L’atomicité garantit qu’une transaction est indivisible : soit toutes ses opérations s’exécutent, soit aucune (annulation complète, « rollback ») en cas d’échec.',
        ['Une transaction s’exécute entièrement ou pas du tout', 'Chaque attribut contient une seule valeur', 'Les données ne peuvent pas être dupliquées', 'Les index sont mis à jour automatiquement']],
      ['Quelle commande SQL supprime une table ainsi que sa structure ?',
        'DROP TABLE supprime définitivement la table et sa structure. DELETE ne supprime que les lignes (éventuellement toutes) et TRUNCATE vide la table tout en conservant sa structure.',
        ['DROP TABLE', 'DELETE FROM', 'TRUNCATE TABLE', 'REMOVE TABLE']],
      ['À quoi sert une clé étrangère (FOREIGN KEY) ?',
        'Une clé étrangère référence la clé primaire d’une autre table et garantit l’intégrité référentielle : impossible d’insérer une valeur qui n’existe pas dans la table parente.',
        ['À établir un lien référentiel entre deux tables', 'À chiffrer les données sensibles', 'À accélérer les requêtes de tri', 'À définir une clé primaire composite']],
      ['Quelle forme normale élimine les dépendances transitives entre attributs non clés ?',
        'En troisième forme normale (3FN), aucun attribut non clé ne dépend d’un autre attribut non clé : les dépendances transitives sur la clé primaire sont supprimées.',
        ['Troisième forme normale (3FN)', 'Première forme normale (1FN)', 'Deuxième forme normale (2FN)', 'Aucune : c’est impossible']],
    ],
  },
  {
    title: 'التحليل الرياضي: النهايات والاتصال',
    description:
      'اختبار شامل في أساسيات التحليل الرياضي للسنة الأولى جامعي: النهايات، الاتصال، والمشتقات.',
    subject: 'الرياضيات', level: 'L1', lang: 'ar', duration: 15, ai: 0, author: 0, daysAgo: 9,
    questions: [
      ['ما هو تعريف نهاية الدالة عند نقطة؟',
        'نهاية الدالة f عند النقطة a هي القيمة التي تقترب منها f(x) عندما يقترب x من a من الجانبين معا، بشرط وجود هذه القيمة وأنها وحيدة.',
        ['القيمة التي تقترب منها الدالة عندما يقترب المتغير من النقطة', 'القيمة العظمى للدالة في جوار النقطة', 'مشتق الدالة عند تلك النقطة', 'المساحة الواقعة تحت المنحنى']],
      ['متى تكون الدالة متصلة عند نقطة؟',
        'الاتصال عند النقطة a يتطلب ثلاثة شروط: وجود الدالة عند a، وجود نهايتها عند a، وتساوي النهاية مع قيمة الدالة عند النقطة.',
        ['عندما تساوي نهاية الدالة عند النقطة قيمتها عند تلك النقطة', 'عندما تكون الدالة قابلة للاشتقاق فقط', 'عندما تكون نهاية الدالة لانهائية', 'عندما تتقاطع الدالة مع محور الفواصل']],
      ['ما هي مشتقة الدالة f(x) = x² ؟',
        'باستخدام قاعدة القوة التي تنص على أن مشتقة xⁿ هي n·xⁿ⁻¹، نجد أن مشتقة x² تساوي 2x.',
        ['2x', 'x', 'x³⁄3', '2']],
      ['ماذا يعني الميل الموجب للمماس عند نقطة؟',
        'الميل الموجب للمماس يعني أن معدل التغير المحدود موجب عند تلك النقطة، أي أن الدالة متزايدة في جوارها.',
        ['الدالة متزايدة في جوار تلك النقطة', 'الدالة متناقصة في جوار تلك النقطة', 'للدالة قيمة عظمى عند تلك النقطة', 'الدالة غير معرفة عند تلك النقطة']],
    ],
  },
  {
    title: 'مقدمة في الفيزياء النووية',
    description:
      'مفاهيم أساسية في الفيزياء النووية: تركيب النواة، الاضمحلال الإشعاعي، والانشطار والاندماج.',
    subject: 'الفيزياء', level: 'L3', lang: 'ar', duration: 15, ai: 0, author: 0, daysAgo: 8,
    questions: [
      ['ما هي مكونات نواة الذرة؟',
        'تتكون نواة الذرة من البروتونات (شحنتها موجبة) والنيوترونات (متعادلة كهربائيا)، أما الإلكترونات فتتحرك في مدارات حول النواة.',
        ['البروتونات والنيوترونات', 'الإلكترونات والبروتونات', 'الإلكترونات والفوتونات', 'النيوترونات والإلكترونات']],
      ['ما هو الاضمحلال الإشعاعي؟',
        'الاضمحلال الإشعاعي عملية عشوائية تتحول فيها النوى غير المستقرة بصدار جسيمات ألفا أو بيتا أو أشعة غاما إلى أنوية أكثر استقرارا.',
        ['تحول نواة غير مستقرة إلى نواة أكثر استقرارا مع إصدار إشعاع', 'انقسام الإلكترونات إلى جسيمات أصغر', 'امتصاص النواة للفوتونات فقط', 'اندماج ذرتين خفيفتين في نواة واحدة']],
      ['ما هي وحدة قياس نشاط المادة المشعة؟',
        'البيكريل (Bq) هو وحدة النشاط الإشعاعي في النظام الدولي ويعادل اضمحلالا نوويا واحدا في الثانية.',
        ['البيكريل (Bq)', 'الجول (J)', 'الفولت (V)', 'النيوتون (N)']],
      ['ما الفرق بين الانشطار والاندماج النووي؟',
        'في الانشطار تنقسم نواة ثقيلة مثل اليورانيوم-235 إلى نواتين أخف مع طاقة كبيرة، أما الاندماج فيدمج نواتين خفيفتين مثل نظائر الهيدروجين لتكوين نواة أثقل.',
        ['الانشطار تقسيم نواة ثقيلة، والاندماج دمج نواتين خفيفتين', 'الانشطار يطلق طاقة أقل دائما من الاندماج', 'الاندماج يحدث فقط في المفاعلات الصناعية', 'لا فرق بينهما، إنهما العملية نفسها']],
    ],
  },
  {
    title: 'Cell Biology Fundamentals',
    description:
      'Core concepts every first-year biology student should master: organelles, DNA, ribosomes and cellular energy.',
    subject: 'Biology', level: 'L1', lang: 'en', duration: 15, ai: 0, author: 0, daysAgo: 7,
    questions: [
      ['Which organelle is known as the powerhouse of the cell?',
        'Mitochondria generate most of the cell’s ATP through cellular respiration, which is why they are nicknamed the powerhouse of the cell.',
        ['Mitochondrion', 'Ribosome', 'Golgi apparatus', 'Lysosome']],
      ['What is the primary function of ribosomes?',
        'Ribosomes translate messenger RNA into chains of amino acids, assembling the proteins the cell needs to grow and function.',
        ['Protein synthesis', 'DNA replication', 'Lipid storage', 'Waste removal']],
      ['Which molecule stores genetic information in cells?',
        'DNA (deoxyribonucleic acid) stores hereditary information in the sequence of its four nucleotide bases (A, T, C, G).',
        ['DNA', 'ATP', 'Glucose', 'Cellulose']],
      ['What process do plant cells use to convert light energy into chemical energy?',
        'Photosynthesis, carried out in chloroplasts, converts light energy, water and CO₂ into glucose and oxygen.',
        ['Photosynthesis', 'Fermentation', 'Aerobic respiration', 'Osmosis']],
    ],
  },
  {
    title: 'Introduction to Microeconomics',
    description:
      'Supply, demand, elasticity and market equilibrium — the building blocks of your L2 microeconomics course.',
    subject: 'Economics', level: 'L2', lang: 'en', duration: 15, ai: 0, author: 0, daysAgo: 6,
    questions: [
      ['What does the law of demand state?',
        'The law of demand describes the inverse relationship between price and quantity demanded, ceteris paribus: when price rises, quantity demanded falls.',
        ['As price rises, quantity demanded falls, all else equal', 'As price rises, quantity demanded rises too', 'Supply always creates its own demand', 'Demand is completely unaffected by price']],
      ['What is opportunity cost?',
        'Opportunity cost is the value of the next-best alternative you give up when making a choice — a core concept of economic reasoning.',
        ['The value of the best alternative forgone', 'The total money paid for a good', 'The sum of all fixed production costs', 'A tax applied to imported goods']],
      ['A competitive market is in equilibrium when:',
        'At the equilibrium price, the quantity buyers want to purchase exactly matches the quantity sellers offer, so there is no pressure on price to change.',
        ['Quantity supplied equals quantity demanded', 'Prices reach their maximum level', 'Producers earn zero revenue', 'The government fixes the price']],
      ['What does price elasticity of demand measure?',
        'Price elasticity of demand measures how strongly quantity demanded responds to a change in price: elastic goods are very sensitive, inelastic goods are not.',
        ['The sensitivity of quantity demanded to a change in price', 'The slope of the supply curve', 'The total revenue of a firm', 'The fixed cost per unit produced']],
    ],
  },
  {
    title: 'Mécanique quantique : notions fondamentales',
    description:
      'Fonction d’onde, principe d’incertitude, quantification et équation de Schrödinger — un quiz généré par IA pour réviser le cours de M1.',
    subject: 'Physique', level: 'M1', lang: 'fr', duration: 20, ai: 1, aiProvider: 'demo-generator', author: 0, daysAgo: 4,
    questions: [
      ['Que représente la fonction d’onde ψ en mécanique quantique ?',
        'Selon l’interprétation de Born, |ψ(x,t)|² représente la densité de probabilité de trouver la particule en x à l’instant t : la fonction d’onde contient toute l’information physique accessible du système.',
        ['L’amplitude de probabilité dont le module carré donne la densité de probabilité de présence', 'La trajectoire exacte suivie par la particule', 'L’énergie totale du système quantique', 'La vitesse instantanée de la particule']],
      ['Que dit le principe d’incertitude de Heisenberg ?',
        'Le principe d’incertitude impose Δx·Δp ≥ ℏ/2 : mesurer précisément la position d’une particule rend sa quantité de mouvement intrinsèquement floue, et inversement — ce n’est pas une limite technologique mais un principe fondamental.',
        ['Il est impossible de connaître simultanément avec une précision arbitraire la position et la quantité de mouvement', 'Toute mesure détruit irrémédiablement le système', 'L’énergie d’un système isolé n’est conservée qu’en moyenne', 'Les photons n’ont jamais de masse au repos']],
      ['Qu’appelle-t-on quantification de l’énergie d’un système lié ?',
        'Un système quantique lié (atome, puits de potentiel) ne peut occuper que certains niveaux d’énergie discrets, séparés par des intervalles finis : c’est l’origine des raies spectrales observées.',
        ['Le fait que le système ne puisse occuper que des valeurs discrètes d’énergie', 'Le fait que l’énergie varie de manière continue', 'Le fait que l’énergie soit toujours nulle au repos', 'Le fait que l’énergie dépende uniquement de la température']],
      ['Quel est le rôle de l’équation de Schrödinger ?',
        'L’équation de Schrödinger joue en mécanique quantique le rôle que joue la seconde loi de Newton en mécanique classique : elle régit l’évolution temporelle de la fonction d’onde pour un potentiel donné.',
        ['Décrire l’évolution temporelle de la fonction d’onde d’un système quantique', 'Calculer la pression d’un gaz parfait', 'Décrire la dilatation du temps en relativité', 'Mesurer la constante de désintégration radioactive']],
    ],
  },
  {
    title: 'Statistiques descriptives',
    description:
      'Moyenne, médiane, écart-type et distribution normale — quiz généré par IA à partir du résumé de cours de L2.',
    subject: 'Mathématiques', level: 'L2', lang: 'fr', duration: 15, ai: 1, aiProvider: 'demo-generator', author: 0, daysAgo: 3,
    questions: [
      ['Quelle mesure de tendance centrale est la plus sensible aux valeurs extrêmes ?',
        'La moyenne intègre toutes les valeurs : une seule valeur aberrante peut la déplacer fortement, tandis que la médiane ne dépend que de l’ordre des valeurs et reste stable.',
        ['La moyenne arithmétique', 'La médiane', 'Le mode', 'La moyenne géométrique']],
      ['Que mesure l’écart-type ?',
        'L’écart-type est la racine carrée de la variance : il quantifie la dispersion, c’est-à-dire la distance moyenne des observations autour de la moyenne.',
        ['La dispersion des valeurs autour de la moyenne', 'La valeur la plus fréquente de la série', 'La différence entre le maximum et le minimum', 'Le degré de corrélation entre deux variables']],
      ['Dans une distribution normale, quel pourcentage des données se situe approximativement à ±1 écart-type de la moyenne ?',
        'La règle empirique (68-95-99,7) indique qu’environ 68 % des observations d’une loi normale tombent dans l’intervalle [μ − σ, μ + σ].',
        ['Environ 68 %', 'Environ 95 %', 'Environ 50 %', 'Environ 99,7 %']],
      ['Quand est-il préférable d’utiliser la médiane plutôt que la moyenne ?',
        'La médiane est un indicateur robuste, non influencé par les valeurs extrêmes : on la préfère pour les distributions asymétriques, comme la distribution des revenus.',
        ['Lorsque la distribution contient des valeurs extrêmes ou est asymétrique', 'Lorsque les données sont parfaitement symétriques', 'Lorsqu’on cherche la valeur la plus fréquente', 'Lorsque la variance est nulle']],
    ],
  },
];

const ATTEMPTS = [
  // [userIdx, quizIdx, wrongAt(positions, 0-based), daysAgo, hour, durationSeconds]
  [1, 0, [3], 11, 14, 512],
  [1, 1, [1, 2], 9, 16, 468],
  [2, 4, [2], 7, 9, 350],
  [2, 5, [], 6, 11, 296],
  [3, 6, [1], 5, 15, 540],
  [1, 7, [0], 3, 18, 385],
  [2, 0, [2, 4], 4, 10, 601],
  [3, 7, [], 2, 13, 312],
  [1, 0, [], 2, 20, 289],
  [2, 4, [1, 3], 1, 8, 377],
  [3, 6, [0, 2], 1, 17, 495],
  [1, 2, [2], 0, 9, 264],
  [2, 5, [3], 0, 12, 331],
  [3, 0, [1], 0, 16, 356],
];

async function tablesExist() {
  try {
    await get('SELECT id FROM users LIMIT 1');
    return true;
  } catch {
    return false;
  }
}

export async function seedIfNeeded(force = false) {
  if (force) {
    try {
      await run('DELETE FROM attempts');
      await run('DELETE FROM answers');
      await run('DELETE FROM questions');
      await run('DELETE FROM quizzes');
      await run('DELETE FROM users');
    } catch {
      /* tables not created yet */
    }
  } else if (await tablesExist()) {
    const row = await get('SELECT COUNT(*) AS n FROM users');
    if (Number(row?.n || 0) > 0) return false;
  }

  console.log('[seed] Empty database — creating demo dataset…');
  const hash = await bcrypt.hash('password123', 10);
  const userIds = [];
  for (let i = 0; i < USERS.length; i++) {
    const u = USERS[i];
    const res = await run(
      'INSERT INTO users (name, email, password_hash, role, academic_level, preferred_language, avatar_color, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
      [u.name, u.email, hash, u.role, u.level, u.lang, u.color, iso(30 - i), iso(30 - i)]
    );
    userIds.push(res.insertId);
  }

  const quizIds = [];
  const quizQuestions = []; // per quiz: [{id, correctAnswerId, answerIds[]}]
  for (const q of QUIZZES) {
    const qRes = await run(
      `INSERT INTO quizzes (created_by, title, description, subject, level, language, duration_minutes, is_published, ai_generated, ai_provider, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [userIds[q.author], q.title, q.description, q.subject, q.level, q.lang, q.duration, 1, q.ai, q.aiProvider || null, iso(q.daysAgo, 9), iso(q.daysAgo, 9)]
    );
    quizIds.push(qRes.insertId);
    const questions = [];
    for (let p = 0; p < q.questions.length; p++) {
      const [text, explanation, answers] = q.questions[p];
      const qIns = await run(
        'INSERT INTO questions (quiz_id, question_text, explanation, position, created_at, updated_at) VALUES (?,?,?,?,?,?)',
        [qRes.insertId, text, explanation, p, iso(q.daysAgo, 9), iso(q.daysAgo, 9)]
      );
      // rotate answers so the correct one isn't always first
      const offset = p % answers.length;
      const ordered = answers.map((_, i) => answers[(i + offset) % answers.length]);
      const answerIds = [];
      let correctId = null;
      for (let a = 0; a < ordered.length; a++) {
        const isCorrect = ordered[a] === answers[0] ? 1 : 0;
        const aIns = await run(
          'INSERT INTO answers (question_id, answer_text, is_correct, position) VALUES (?,?,?,?)',
          [qIns.insertId, ordered[a], isCorrect, a]
        );
        answerIds.push(aIns.insertId);
        if (isCorrect) correctId = aIns.insertId;
      }
      questions.push({ id: qIns.insertId, correctAnswerId: correctId, answerIds });
    }
    quizQuestions.push(questions);
  }

  for (const [userId, quizId, wrongAt, daysAgo, hour, duration] of ATTEMPTS) {
    const questions = quizQuestions[quizId];
    const details = [];
    let score = 0;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const isCorrect = !wrongAt.includes(i);
      if (isCorrect) score++;
      const selected = isCorrect ? q.correctAnswerId : q.answerIds.find((a) => a !== q.correctAnswerId);
      details.push({ questionId: q.id, selectedAnswerId: selected, correctAnswerId: q.correctAnswerId, correct: isCorrect });
    }
    const total = questions.length;
    const percentage = Math.round((score / total) * 1000) / 10;
    await run(
      `INSERT INTO attempts (user_id, quiz_id, score, total_questions, percentage, duration_seconds, details, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [userIds[userId], quizIds[quizId], score, total, percentage, duration, JSON.stringify(details), iso(daysAgo, hour, 15)]
    );
  }

  console.log(
    `[seed] ✔ ${USERS.length} users, ${QUIZZES.length} quizzes, ${QUIZZES.reduce((n, q) => n + q.questions.length, 0)} questions, ${ATTEMPTS.length} attempts created.`
  );
  return true;
}
