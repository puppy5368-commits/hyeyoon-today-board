window.ENGLISH_V2_WEEK1={
  A:{icon:'👀',title:'읽기',items:[
    {prompt:'👉 소리와 그림을 만나봐요.',text:'this',options:['👉📕 하나를 가리켜요','🙅📕 가리키지 않아요','👥📕 여러 개를 가리켜요'],answer:0,hint:'눈앞의 물건 하나를 손가락으로 가리켜요.'},
    {prompt:'🙋 소리와 그림을 만나봐요.',text:'my',options:['🙋🎒 내가 들고 있어요','👩🎒 다른 사람이 들고 있어요','🏪🎒 가게에 놓여 있어요'],answer:0,hint:'내 가방처럼, 내 것을 말할 때 써요.'},
    {prompt:'🎒 그림에 맞는 단어는?',text:'bag',options:['bag','book','ball'],answer:0,hint:'어깨에 메는 물건이에요.'},
    {prompt:'⚽ 그림에 맞는 단어는?',text:'ball',options:['book','ball','bag'],answer:1,hint:'차거나 던져서 놀아요.'},
    {prompt:'📕 그림에 맞는 단어는?',text:'book',options:['book','bag','ball'],answer:0,hint:'읽는 물건이에요.'},
    {prompt:'문장과 맞는 그림은?',text:'This is my bag.',options:['🎒','⚽','📕'],answer:0,hint:'bag를 찾아봐요.'},
    {prompt:'문장과 맞는 그림은?',text:'This is my ball.',options:['⚽','🎒','📕'],answer:0,hint:'ball은 공이에요.'},
    {prompt:'문장과 맞는 그림은?',text:'This is my book.',options:['📕','🎒','⚽'],answer:0,hint:'book은 책이에요.'},
    {prompt:'가격을 묻는 상황은?',text:'How much is it?',options:['🛍️ 물건과 가격표','🌧️ 비 오는 날','😴 잠자는 시간'],answer:0,hint:'가게에서 가격을 물어요.'}
  ]},
  B:{icon:'👂',title:'듣기',items:[
    {prompt:'🎒 들은 문장과 맞는 그림은?',text:'This is my bag.',options:['🎒','⚽','📕'],answer:0,hint:'bag를 떠올려요.'},
    {prompt:'⚽ 들은 문장과 맞는 그림은?',text:'This is my ball.',options:['📕','⚽','🎒'],answer:1,hint:'ball은 공이에요.'},
    {prompt:'📕 들은 문장과 맞는 그림은?',text:'This is my book.',options:['📕','🎒','⚽'],answer:0,hint:'book은 책이에요.'},
    {prompt:'가격을 묻는 소리를 들어봐요.',text:'How much is it?',options:['가격을 묻는 말','인사하는 말','작별하는 말'],answer:0,hint:'가게에서 가격을 물어요.'},
    {prompt:'맞는 가격은?',text:"It's three thousand won.",options:['3,000원','5,000원','1,000원'],answer:0,hint:'three는 셋이에요.'},
    {prompt:'맞는 가격은?',text:"It's five thousand won.",options:['3,000원','5,000원','1,000원'],answer:1,hint:'five는 다섯이에요.'}
  ]},
  C:{icon:'🗣️',title:'말하기',items:[
    {prompt:'🎒 따라 말해봐요.',text:'This is my bag.'},
    {prompt:'⚽ 따라 말해봐요.',text:'This is my ball.'},
    {prompt:'📕 따라 말해봐요.',text:'This is my book.'},
    {prompt:'하나를 골라 말해봐요.',choices:[['📕 book','book'],['⚽ ball','ball'],['🚗 toy car','toy car']],text:'This is my {choice}.'},
    {prompt:'가게 놀이: 가격을 물어봐요.',text:'How much is it?'},
    {prompt:'가게 놀이: 가격을 말해봐요.',text:"It's 3,000 won."},
    {prompt:'마지막 문장을 골라 말해봐요.',choices:[['가방','This is my bag.'],['책','This is my book.'],['가격','How much is it?'],['5천 원','It’s 5,000 won.']],text:'{choice}'}
  ]}
};

// Week 1 above stays byte-for-byte unchanged. All later situations are original.
(() => {
  const q=(text,options,answer,hint,prompt='소리를 듣고 상황과 글자를 연결해요.')=>({text,options,answer,hint,prompt});
  const clock=n=>['','🕐','🕑','🕒','🕓','🕔','🕕','🕖','🕗','🕘','🕙','🕚','🕛'][n];
  const numbers=['one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'];
  const time=n=>q(`It's ${numbers[n-1]} o'clock.`,[clock(n),clock(n%12+1),clock((n+3)%12+1)],0,'긴 바늘은 12, 짧은 바늘은 시간을 가리켜요.','시계와 소리를 연결해요.');
  const own=(word,object)=>q(word,[`🙋 ${object} 내가 들고 있어요`,`🫵 ${object} 네가 들고 있어요`,`🏪 ${object} 가게에 있어요`],word==='my'?0:1,'말하는 사람과 듣는 사람 중 누가 들고 있는지 봐요.');
  const position=(prep,object='cap')=>q(`The ${object} is ${prep} the chair.`,['🧢 의자 위에 놓여 있어요','🧢 의자 아래에 있어요','🧢 가방 안에 있어요'],prep==='on'?0:prep==='under'?1:2,'의자 윗면과 아래 공간을 살펴봐요.','모자와 의자의 위치를 찾아요.');
  const action=(word)=>q(`I'm ${word}.`,['🎨 그림을 그려요','📖 책을 읽어요','🍎 간식을 먹어요','⚽ 공을 가지고 놀아요'],['drawing a picture','reading','eating','playing'].indexOf(word),'누가 어떤 행동을 하는지 찾아봐요.','그림 속 행동과 연결해요.');
  const bag=q('This is my bag.',['🙋🎒 내 가방을 보여줘요','🫵🎒 네 가방을 가리켜요','🙋📕 내 책을 보여줘요'],0,'말하는 아이가 자기 물건을 보여줘요.');
  const price=q('How much is it?',['🛍️ 물건의 가격표를 살펴봐요','🕒 시계를 살펴봐요','🧢 모자를 찾아봐요'],0,'가게에서 사려는 물건을 보고 물어요.');
  const five=q("It's five thousand won.",['5,000원 🏷️','3,000원 🏷️','1,000원 🏷️'],0,'five 소리를 다시 들어봐요.','가게의 가격표를 찾아요.');
  const yes=q('Is this your bag? Yes, it is.',['🫵🎒 네 가방이 맞아요','🙅🎒 네 가방이 아니에요','🙋📕 내 책이에요'],0,'가방의 주인이 고개를 끄덕여요.');
  const no=q("Is this your book? No, it isn't.",['🙅📕 네 책이 아니에요','🫵📕 네 책이 맞아요','🫵🎒 네 가방이에요'],0,'책의 주인이 고개를 저어요.');
  const where=q("Where's my cap?",['🧢 모자를 찾아 두리번거려요','🏷️ 가격표를 봐요','🎨 그림을 그려요'],0,'찾고 있는 물건을 떠올려요.');
  const whatTime=q('What time is it?',['⌚ 시계를 보며 물어요','🛍️ 가게에서 물건을 골라요','🍎 간식을 먹어요'],0,'시간이 궁금한 상황이에요.');
  const banks={
    2:[own('my','🎒'),own('your','🎒'),q('this',['👉🎒 바로 앞 가방 하나를 가리켜요','🏃 멀리 달려가요','👥 가방 여러 개를 모아요'],0,'손가락이 가리키는 물건을 봐요.'),q('pencil case',['👝 필통','🎒 가방','📕 책'],0,'연필을 모아 넣는 물건이에요.'),bag,yes,no,q('This is my pencil case.',['🙋👝 내 필통을 보여줘요','🫵👝 네 필통을 보여줘요','🙋📕 내 책을 보여줘요'],0,'말하는 아이의 필통이에요.')],
    3:[q('cap',['🧢','🎒','📕'],0,'머리에 쓰는 물건이에요.'),q('chair',['🪑','🎒','📕'],0,'앉는 물건이에요.'),where,position('on'),position('under'),q('The cap is in the bag.',['🧢 가방 안','🧢 가방 위','🧢 가방 아래'],0,'가방을 열면 안에 보여요.'),q('The book is on the desk.',['📕 책상 위','📕 책상 아래','📕 가방 안'],0,'책상 윗면에 놓여 있어요.'),q('The bag is under the desk.',['🎒 책상 아래','🎒 책상 위','🎒 의자 위'],0,'책상 다리 사이를 살펴봐요.')],
    4:[whatTime,...[1,2,3,4,5,6,7].map(time)],
    5:[...[8,9,10,11,12,3].map(time),q('morning',['🌅 아침에 창문을 열어요','🌤️ 점심 뒤에 놀아요','🌙 밤에 잠들어요'],0,'해가 떠오르는 때예요.'),q('afternoon',['🌤️ 점심 뒤에 놀아요','🌅 일어나 아침을 먹어요','🌙 잠자리에 들어요'],0,'점심을 먹고 난 뒤예요.')],
    6:[q('draw',['🎨','📖','🍎'],0,'종이에 그림을 만들어요.'),q('read',['📖','⚽','🍎'],0,'책을 펼쳐 봐요.'),q('eat',['🍎','🎨','📖'],0,'간식을 입에 넣어요.'),q('play',['⚽','📖','🍎'],0,'즐겁게 놀아요.'),...['drawing a picture','reading','eating','playing'].map(action)],
    7:[...['reading','playing','drawing a picture','eating'].map(action),q("I'm reading.",['📖 소파에서 책을 봐요','🎨 책상에서 그림을 그려요','⚽ 마당에서 놀아요'],0,'책을 펼친 사람을 찾아요.'),q("I'm playing.",['⚽ 친구와 공놀이해요','🍎 간식을 먹어요','📖 책을 봐요'],0,'놀이하는 사람을 찾아요.'),q("I'm drawing a picture.",['🎨 크레용으로 그려요','🍎 사과를 먹어요','📖 책장을 넘겨요'],0,'그림을 만드는 도구를 찾아요.'),q("I'm eating.",['🍎 사과를 먹어요','⚽ 공을 차요','🎨 그림을 그려요'],0,'간식을 먹는 장면을 찾아요.')],
    8:[price,five,yes,no,position('on'),time(4),action('reading'),action('eating')],
    9:[q('This is my book.',['👉🙋📕 내 책 하나를 가리켜요','👉🫵📕 네 책 하나를 가리켜요','🙋⚽ 내 공을 들어요'],0,'this와 my를 장면 속에서 찾아요.'),own('your','👝'),q('Is this your bag?',['🎒 주인을 찾아 물어요','🎒 가격표를 물어요','🎒 위치를 물어요'],0,'네 물건인지 물어보는 상황이에요.'),q("It is on the chair.",['🧢 의자 위','🧢 의자 아래','🧢 가방 안'],0,'앞에서 찾던 모자를 떠올려요.'),where,whatTime,price,five],
    10:[price,five,yes,no,whatTime,time(3),q("Where's my cap? It's on the chair.",['🧢 의자 위','🧢 의자 아래','🧢 가방 안'],0,'두 번째 목소리가 알려주는 자리를 찾아요.'),q("What are you doing? I'm reading.",['📖','🎨','🍎'],0,'책을 읽는 장면을 찾아요.')],
    11:[q('This is my bag. The bag is on the chair.',['🙋🎒 내 가방 · 의자 위','🫵🎒 네 가방 · 의자 아래','🙋📕 내 책 · 책상 위'],0,'누구의 무엇인지, 어디인지 순서대로 봐요.'),q('This is your book. The book is on the desk.',['🫵📕 네 책 · 책상 위','🙋📕 내 책 · 의자 위','🫵🎒 네 가방 · 책상 아래'],0,'book과 desk를 찾아요.'),q("It's three o'clock. I'm reading.",['🕒📖','🕔🎨','🕒🍎'],0,'시계를 찾고 행동을 찾아요.'),q("It's five o'clock. I'm playing.",['🕔⚽','🕒⚽','🕔📖'],0,'시간과 행동 두 가지를 연결해요.'),q('This is my cap. The cap is in the bag.',['🙋🧢 가방 안','🙋🧢 의자 위','🫵🧢 책상 아래'],0,'cap이 놓인 마지막 자리를 찾아요.'),q("This is my book. I'm reading.",['🙋📕📖','🙋🎒⚽','🫵📕🍎'],0,'내 책을 읽는 장면을 골라요.'),q("This is my ball. It's on the chair.",['🙋⚽ 의자 위','🙋⚽ 의자 아래','🫵⚽ 가방 안'],0,'공의 주인과 위치를 찾아요.'),q("It's two o'clock. I'm eating. This is my bag.",['🕑🍎🙋🎒','🕑📖🫵🎒','🕓🍎🙋📕'],0,'한 문장씩 시간, 행동, 물건을 연결해요.')],
    12:[bag,own('your','🎒'),price,five,yes,position('on'),time(3),action('drawing a picture')]
  };
  const titles=['','🛍️ 희윤이의 작은 가게','🎒 이거 네 가방이야?','🧢 어디에 있을까?','🕒 지금 몇 시야?','⏰ 시간을 듣고 찾아요','🎨 지금 뭐 하고 있어?','🏃 행동을 듣고 말해요','🎧 학교 영어 섞어 듣기','🔤 자주 만나는 작은 단어','💬 짧은 대화를 이어봐요','📖 두세 문장을 연결해요','🏆 다시 해보는 영어 탐험'];
  const speaking={
    2:['Is this your bag?','Yes, it is.',"No, it isn't.",'This is my book.','This is my pencil case.','Is this your book?'],
    3:["Where's my cap?",'The cap is on the chair.','The cap is under the chair.','The cap is in the bag.','The book is on the desk.','The bag is under the desk.'],
    4:['What time is it?',"It's one o'clock.","It's two o'clock.","It's three o'clock.","It's five o'clock.","It's seven o'clock."],
    5:["It's eight o'clock.","It's nine o'clock.","It's ten o'clock.","It's eleven o'clock.","It's twelve o'clock.",'What time is it?'],
    6:["I'm drawing a picture.","I'm reading.","I'm eating.","I'm playing.","I'm reading.","I'm drawing a picture."],
    7:["I'm playing.","I'm eating.","I'm reading.","I'm drawing a picture.","I'm playing.","I'm reading."],
    8:['How much is it?','Is this your bag?','The cap is on the chair.',"It's four o'clock.","I'm reading.","It's five thousand won."],
    9:['This is my book.','Is this your bag?',"Where's my cap?",'What time is it?','How much is it?',"It's on the chair."],
    10:['How much is it?',"It's five thousand won.",'Is this your bag?','Yes, it is.','What time is it?',"It's three o'clock."],
    11:['This is my bag.','The bag is on the chair.',"It's three o'clock.","I'm reading.",'This is your book.','The book is on the desk.'],
    12:['This is my bag.','Is this your bag?','How much is it?','The cap is on the chair.',"It's three o'clock.","I'm drawing a picture."]
  };
  const scene=text=>text.includes('How much')?'🛍️ 가게에서 물건의 가격을 물어봐요.':text.includes('thousand')?'🏷️ 가게에서 5,000원 가격표를 보여줘요.':text.includes('What time')?'⌚ 친구와 시계를 보며 시간을 물어봐요.':text.includes("o'clock")?'⌚ '+(numbers.findIndex(n=>text.includes(' '+n+' '))>=0?clock(numbers.findIndex(n=>text.includes(' '+n+' '))+1):'시계')+' 시계의 시간을 말해봐요.':text.includes('Where')?'🧢 내 모자가 보이지 않아요. 친구에게 물어봐요.':text.includes('on the chair')?'🪑 의자 위에 물건이 있어요.':text.includes('under the chair')?'🪑 의자 아래에 모자가 있어요.':text.includes('in the bag')?'🎒 가방을 열면 안에 모자가 있어요.':text.includes('on the desk')?'📕 책상 위에 책이 있어요.':text.includes('under the desk')?'🎒 책상 아래에 가방이 있어요.':text.includes('Is this your')?'🫵 주인을 찾은 물건을 친구에게 보여줘요.':text==='Yes, it is.'?'🙂 친구가 보여준 물건이 내 것이 맞아요.':text.includes("isn't")?'🙅 친구가 보여준 물건이 내 것이 아니에요.':text.includes('drawing')?'🎨 크레용으로 그림을 그리고 있어요.':text.includes('reading')?'📖 펼친 책을 읽고 있어요.':text.includes('eating')?'🍎 사과를 먹고 있어요.':text.includes('playing')?'⚽ 공을 가지고 놀고 있어요.':text.includes('pencil case')?'🙋👝 내 필통을 보여줘요.':text.includes('your book')?'🫵📕 친구의 책을 가리켜요.':text.includes('book')?'🙋📕 내 책을 보여줘요.':'🙋🎒 내 가방을 보여줘요.';
  window.ENGLISH_V2_WEEKS={1:{title:titles[1],lesson:'학교 Lesson 8',...window.ENGLISH_V2_WEEK1}};
  for(let w=2;w<=12;w++){
    // Alternate answer positions so children must match the situation, not a position.
    const variants=banks[w].map((item,i)=>{const options=[...item.options],shift=i%options.length;return {...item,options:[...options.slice(shift),...options.slice(0,shift)],answer:(item.answer-shift+options.length)%options.length};});
    const listen=variants.slice(w===3?1:0,w===3?8:7).map(item=>({...item,prompt:'🔊 소리를 듣고 맞는 상황을 찾아요.'}));
    const c=speaking[w].map((text,i)=>({text,scene:scene(text),prompt:i<2?'🔊 듣고 따라 말해봐요.':i<4?'상황을 골라 말해봐요.':'배운 표현을 혼자 말해봐요.',stage:i<2?'repeat':i<4?'choose':'solo',...(i>=2&&i<4?{text:'{choice}',choices:[[scene(text)+' · '+text,text],[scene(speaking[w][(i+1)%6])+' · '+speaking[w][(i+1)%6],speaking[w][(i+1)%6]]]}:{})}));
    window.ENGLISH_V2_WEEKS[w]={title:titles[w],lesson:({2:'학교 Lesson 9',3:'Lesson 6 보강',4:'학교 Lesson 10',5:'Lesson 10 보강',6:'학교 Lesson 11',7:'Lesson 11 보강',8:'Lesson 8~11 누적',9:'작은 단어 다시 연결',10:'두 사람이 주고받는 말',11:'짧은 문장 연결',12:'1주차와 함께 살펴보기'})[w],A:{icon:'👀',title:'읽기',items:variants},B:{icon:'👂',title:'듣기',items:listen},C:{icon:'🗣️',title:'말하기',items:c}};
  }
})();
