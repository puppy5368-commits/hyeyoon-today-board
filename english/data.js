// 1주차만 제공하는 독립 영어 탐험. 모든 문항은 이 보드를 위해 작성했습니다.
window.ENGLISH_WEEK = [
  {id:'A',icon:'👀',name:'읽기 탐험',intro:'작은 단어에서 짧은 이야기까지. 소리 내어 읽어도, 눈으로 읽어도 좋아요.',items:[
    {skill:'단어 읽기',text:'cat',prompt:'이 낱말에 어울리는 것은?',options:['🐶 강아지','🐱 고양이','🐦 새'],answer:1,hint:'야옹 하고 우는 동물을 떠올려요.',explanation:'cat은 고양이예요.'},
    {skill:'단어 읽기',text:'book',prompt:'이 낱말에 어울리는 것은?',options:['📚 책','👜 가방','✏️ 연필'],answer:0,hint:'이야기를 읽을 때 펼치는 물건이에요.',explanation:'book은 책이에요.'},
    {skill:'단어 읽기',text:'happy',prompt:'어떤 기분일까요?',options:['😴 졸려요','😢 슬퍼요','😊 행복해요'],answer:2,hint:'기분 좋은 일이 생겨 웃는 모습을 떠올려요.',explanation:'happy는 행복한, 기쁜이라는 뜻이에요.'},
    {skill:'짧은 문장 읽기',text:'This is my school.',prompt:'무엇을 소개하고 있나요?',options:['자기 집','자기 학교','친구의 책'],answer:1,hint:'school은 학생들이 배우러 가는 곳이에요.',explanation:'이곳은 나의 학교예요. school은 학교, my는 나의예요.'},
    {skill:'문장 이해 · 위치',text:'The cat is under the table.',prompt:'문장과 맞는 장면은?',options:['고양이가 탁자 위에 있어요.','고양이가 의자 아래에 있어요.','고양이가 탁자 아래에 있어요.'],answer:2,hint:'under는 아래에, table은 탁자예요.',explanation:'고양이가 탁자 아래에 있어요. 위치와 물건을 함께 확인해요.'},
    {skill:'두 문장 연결',text:'Jina has a red bag.\nShe takes the bag to school.',prompt:"What color is Jina's bag?",options:['🔴 빨간색','🔵 파란색','🟡 노란색'],answer:0,hint:'What color는 무슨 색인지 묻는 말이에요. red를 찾아봐요.',explanation:'지나는 빨간 가방을 가지고 학교에 가요. red가 가방의 색을 알려 줘요.'},
    {skill:'두 문장 연결 · 대상',text:'Tom has two apples.\nHe gives one apple to Mina.',prompt:'Who gets an apple from Tom?',options:['톰','미나','톰과 미나가 아닌 친구'],answer:1,hint:'Who는 누구인지 물어요. gives ... to Mina는 미나에게 준다는 말이에요.',explanation:'톰이 미나에게 사과 하나를 줘요. 받는 사람은 Mina예요.'},
    {skill:'이야기 이해 · 순서',text:'It is raining.\nYuna puts on her boots before she goes outside.',prompt:'What does Yuna do before going outside?',options:['장화를 신어요.','밖에서 책을 읽어요.','장화를 벗어요.'],answer:0,hint:'before는 ~하기 전에예요. puts on her boots는 장화를 신는다는 말이에요.',explanation:'비가 와요. 유나는 밖에 나가기 전에 장화를 신어요. before로 행동의 순서를 알 수 있어요.'}
  ]},
  {id:'B',icon:'👂',name:'듣기 탐험',intro:'화면의 문장 대신 귀를 열어봐요. 한 번 더 들어도 괜찮아요.',items:[
    {skill:'단어 듣기',text:'Apple.',prompt:'어떤 낱말을 들었나요?',options:['🍎 사과','📖 책','🐱 고양이'],answer:0,hint:'먹을 수 있는 과일 이름이에요.',explanation:'Apple은 사과예요.'},
    {skill:'표현 듣기',text:'Good morning!',prompt:'언제 하는 인사일까요?',options:['잠자리에 들 때','아침에 만났을 때','헤어질 때'],answer:1,hint:'morning은 아침을 뜻해요.',explanation:'Good morning!은 아침에 하는 인사예요.'},
    {skill:'문장 듣기 · 수',text:'I have two pencils.',prompt:'가지고 있는 것은?',options:['연필 한 자루','책 두 권','연필 두 자루'],answer:2,hint:'물건 이름과 수를 나누어 들어봐요. two는 둘이에요.',explanation:'나는 연필 두 자루를 가지고 있어요. two pencils를 함께 들어요.'},
    {skill:'문장 듣기 · 위치',text:'The dog is on the chair.',prompt:'강아지는 어디에 있나요?',options:['의자 위','의자 아래','탁자 위'],answer:0,hint:'on은 위에, chair는 의자예요.',explanation:'강아지는 의자 위에 있어요.'},
    {skill:'문장 듣기 · 좋아하는 것',text:'I like apples, but I do not like bananas.',prompt:'말한 사람의 취향은?',options:['바나나만 좋아해요.','사과는 좋아하지만 바나나는 좋아하지 않아요.','두 과일을 모두 좋아해요.'],answer:1,hint:'but 뒤의 do not like는 좋아하지 않는다는 말이에요.',explanation:'사과는 좋아하지만 바나나는 좋아하지 않는다고 했어요.'},
    {skill:'두 문장 듣기',text:'Mina has a blue umbrella. She takes it to the park.',prompt:'미나가 공원에 가져가는 것은?',options:['빨간 가방','파란 가방','파란 우산'],answer:2,hint:'blue는 파란색, umbrella는 우산이에요. it은 앞의 물건을 가리켜요.',explanation:'미나는 파란 우산을 가지고 있어요. 그것을 공원에 가져가요.'},
    {skill:'두 문장 듣기 · 순서',text:'Ben finishes his homework. Then he plays soccer with his sister.',prompt:'벤이 숙제를 마친 뒤 하는 일은?',options:['누나 또는 여동생과 축구를 해요.','친구와 숙제를 시작해요.','혼자 책을 읽어요.'],answer:0,hint:'Then은 그다음이에요. 뒤에 이어지는 행동을 들어봐요.',explanation:'벤은 숙제를 끝내요. 그다음 여자 형제와 축구를 해요. sister만으로 나이가 더 많은지는 알 수 없어요.'}
  ]},
  {id:'C',icon:'🗣️',name:'말하기 탐험',intro:'듣고 내 목소리로 말해봐요. 녹음도 발음 점수도 없어요. 작게 말해도 괜찮아요.',items:[
    {skill:'짧은 인사 따라 말하기',text:'Hi!',prompt:'가볍게 인사해볼까요?',help:'친구에게 인사하듯 Hi! 한마디만 말해봐요.'},
    {skill:'좋아하는 것 따라 말하기',text:'I like pizza.',prompt:'한 문장을 듣고 따라 말해봐요.',help:'I like / pizza. 두 덩어리로 나누면 편해요. 나는 피자를 좋아해요.'},
    {skill:'할 수 있는 일 따라 말하기',text:'I can swim.',prompt:'할 수 있는 일을 말하는 표현이에요.',help:'I can / swim. 나는 수영할 수 있어요. 연습 문장이니 실제 수영 실력과 달라도 괜찮아요.'},
    {skill:'표현 선택 · 취향',text:'I like {choice}.',prompt:'What do you like? 좋아하는 것을 골라 말해봐요.',choices:[['🍕 pizza','pizza'],['🍎 apples','apples'],['🐶 dogs','dogs'],['📚 books','books']],help:'좋아하는 것을 고르면 문장이 완성돼요. I like 다음에 고른 낱말을 붙여봐요.'},
    {skill:'표현 선택 · 행동',text:'I can {choice}.',prompt:'해볼 수 있는 일을 골라 말해봐요.',choices:[['🏃 run','run'],['🎤 sing','sing'],['🎨 draw','draw'],['🏊 swim','swim']],help:'I can은 나는 ~할 수 있어요라는 뜻이에요. 한 단어씩 천천히 이어도 좋아요.'},
    {skill:'세 문장 자기소개',text:'Hi!\nMy name is Heeyoon.\nI like {choice}.',prompt:'마지막으로 희윤이를 소개해볼까요?',choices:[['🍕 pizza','pizza'],['🍎 apples','apples'],['🐶 dogs','dogs'],['📚 books','books']],help:'인사 → 이름 → 좋아하는 것 순서예요. 한 줄 말하고 잠깐 쉬어도 좋아요.'}
  ]}
];
