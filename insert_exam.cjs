const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://kieifmfjonynbqvmhzis.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZWlmbWZqb255bmJxdm1oemlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNDEwNDEsImV4cCI6MjA5MTkxNzA0MX0.Mb4ZkNkbZN5f5pWRYXCrxynQN65QBuRgy3z4jMx25SI');

const questions = [
  {
    "id": 1,
    "type": "objective",
    "text": "Qual é o principal objetivo da paráfrase?",
    "options": [
      "A. Copiar exatamente as palavras de um texto original.",
      "B. Reescrever uma ideia com outras palavras, mantendo o sentido.",
      "C. Inventar uma nova história baseada em um texto já existente.",
      "D. Resumir um texto, eliminando as informações mais importantes."
    ],
    "correctAnswer": "B",
    "points": 1
  },
  {
    "id": 2,
    "type": "objective",
    "text": "Leia a referência abaixo:\n\nSILVA, João. A importância da leitura. São Paulo: Editora Saber, 2022.\n\nAssinale a alternativa correta:",
    "options": [
      "A) O nome da editora é João.",
      "B) O título da obra é A importância da leitura.",
      "C) O autor do livro é Editora Saber.",
      "D) O ano de publicação é São Paulo."
    ],
    "correctAnswer": "B",
    "points": 1
  },
  {
    "id": 3,
    "type": "essay",
    "text": "Leia as frases abaixo e indique se cada uma é um Período Simples (PS) ou Período Composto (PC).\n\n(   ) Os alunos estudaram para a prova.\n(   ) Cheguei cedo à escola, mas a sala ainda estava fechada.\n(   ) A professora explicou o conteúdo com paciência.\n(   ) Enquanto eu lia o livro, meu irmão assistia televisão.\n(   ) O cachorro correu pelo parque.\n(   ) Eles saíram de casa quando a chuva parou.\n(   ) Meu amigo comprou um caderno novo e uma caneta azul.\n(   ) O sol apareceu depois que as nuvens se afastaram.\n(   ) Nós visitamos o museu durante a excursão.\n(   ) Ana gosta de música e Pedro prefere esportes.",
    "options": [],
    "correctAnswer": "",
    "points": 1,
    "lineCount": 10
  },
  {
    "id": 4,
    "type": "essay",
    "text": "Leia as orações abaixo e classifique a oração coordenada sindética destacada de acordo com a circunstância que ela expressa.\n\n· Aditiva\n· Adversativa\n· Alternativa\n· Conclusiva\n· Explicativa\n\nA. Ou lê livros ou vê televisão.\nB. Espere um instante, que a atendente está ocupada.\nC. Estudaram muito, portanto acharam a prova fácil.\nD. Ela ia à academia e corria no parque todos os dias.\nE. Gostava de escutar música, porém nunca foi a um concerto.",
    "options": [],
    "correctAnswer": "",
    "points": 1,
    "lineCount": 10
  },
  {
    "id": 5,
    "type": "essay",
    "text": "Leia as orações abaixo e classifique a oração subordinada adverbial destacada de acordo com a circunstância que ela expressa.\n\nCausal\nConsecutiva\nComparativa\nConcessiva\nCondicional\nConformativa\nFinal\nProporcional\nTemporal\n\nA. À medida que o tempo passava, a ansiedade aumentava.\nClassificação: __________________________\n\nB. Embora estivesse cansada, continuou trabalhando.\nClassificação: __________________________\n\nC. Ela canta como uma profissional experiente.\nClassificação: __________________________\n\nD. Quando a aula terminou, os alunos foram embora.\nClassificação: __________________________\n\nE. Farei um resumo para que todos compreendam o conteúdo.\nClassificação: __________________________\n\nF. Já que estava chovendo, decidimos ficar em casa.\nClassificação: __________________________\n\nG. Chegou tão cedo que encontrou a escola fechada.\nClassificação: __________________________\n\nH. Conforme o professor explicou, resolvemos a atividade.\nClassificação: __________________________\n\nI. Se você se esforçar, alcançará seus objetivos.\nClassificação: __________________________\n\nJ. Estudou bastante porque queria passar no concurso.\nClassificação: __________________________",
    "options": [],
    "correctAnswer": "",
    "points": 1,
    "lineCount": 10
  },
  {
    "id": 6,
    "type": "essay",
    "text": "Leia as orações abaixo e classifique a oração subordinada substantiva destacada de acordo com a função que ela exerce.\n\n· Objetiva Direta\n· Objetiva Indireta\n· Completiva Nominal\n· Predicativa\n· Apositiva\n\nA. Tenho certeza de que você fará um excelente trabalho.\nClassificação: ___________________________\n\nB. O diretor afirmou que a reunião será amanhã.\nClassificação: ___________________________\n\nC. O problema é que ninguém avisou os alunos.\nClassificação: ___________________________\n\nD. A aluna precisava de que o professor explicasse novamente o conteúdo.\nClassificação: ___________________________\n\nE. Ela tinha apenas um desejo: que sua família estivesse bem.\nClassificação: ___________________________",
    "options": [],
    "correctAnswer": "",
    "points": 1,
    "lineCount": 5
  },
  {
    "id": 7,
    "type": "essay",
    "text": "Leia as orações abaixo e identifique o tipo de sujeito.\n\n· Sujeito Simples\n· Sujeito Composto\n· Sujeito Oculto (Desinencial)\n· Sujeito Indeterminado\n· Oração sem Sujeito\n\nA. Precisa-se de funcionários para a empresa.\nTipo de sujeito: __________________________\n\nB. João e Maria organizaram a apresentação da turma.\nTipo de sujeito: __________________________\n\nC. Choveu muito durante a madrugada.\nTipo de sujeito: __________________________\n\nD. Os alunos participaram da feira de ciências.\nTipo de sujeito: __________________________\n\nE. Estudamos bastante para a prova final.\nTipo de sujeito: __________________________",
    "options": [],
    "correctAnswer": "",
    "points": 1,
    "lineCount": 5
  },
  {
    "id": 8,
    "type": "objective",
    "text": "Assinale a alternativa que apresenta uma característica da crônica lírica.",
    "options": [
      "A. Narrar apenas fatos históricos com linguagem objetiva.",
      "B. Relatar acontecimentos do dia a dia de forma técnica e científica.",
      "C. Expressar sentimentos, emoções e impressões pessoais sobre situações cotidianas.",
      "D. Apresentar instruções para realizar uma tarefa."
    ],
    "correctAnswer": "C",
    "points": 1
  },
  {
    "id": 9,
    "type": "objective",
    "text": "Assinale a alternativa que apresenta uma oração causal.",
    "options": [
      "A. Embora estivesse nervoso, fez uma boa apresentação.",
      "B. Quando cheguei, a reunião já havia começado.",
      "C. Como o trânsito estava intenso, chegamos atrasados.",
      "D. Se você estudar, terá bons resultados."
    ],
    "correctAnswer": "C",
    "points": 1
  },
  {
    "id": 10,
    "type": "objective",
    "text": "Assinale a alternativa que apresenta uma oração coordenada explicativa.",
    "options": [
      "A. Estudei bastante, portanto fui bem na prova.",
      "B. Chegue cedo, pois a reunião começará às 8 horas.",
      "C. Ou você estuda, ou terá dificuldades na prova.",
      "D. Gostaria de sair, mas preciso trabalhar."
    ],
    "correctAnswer": "B",
    "points": 1
  }
];

async function run() {
  const { data, error } = await supabase.from('exams').insert({
    title: 'Prova 9º Anos A e B',
    professor_id: '972f0680-d1b6-4ae6-b65b-2deb3dd35ec8',
    questions: questions,
    subject: 'Português',
    
    
  }).select();
  
  if (error) {
    console.error('Error inserting exam:', error);
  } else {
    console.log('Exam inserted successfully:', data[0].id);
  }
}
run();
