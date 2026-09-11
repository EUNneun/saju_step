const SAJU = (() => {
  const stems = [
    { id:'gap', char:'甲', name:'갑목', label:'갑', element:'목', polarity:'양', nature:'큰 나무처럼 위로 뻗고 시작하는 기운', season:'봄', keywords:['시작','성장','곧음'] },
    { id:'eul', char:'乙', name:'을목', label:'을', element:'목', polarity:'음', nature:'풀과 덩굴처럼 유연하게 이어지는 기운', season:'봄', keywords:['유연함','적응','연결'] },
    { id:'byeong', char:'丙', name:'병화', label:'병', element:'화', polarity:'양', nature:'태양처럼 넓게 드러나고 확산하는 기운', season:'여름', keywords:['표현','확산','명료함'] },
    { id:'jeong', char:'丁', name:'정화', label:'정', element:'화', polarity:'음', nature:'등불처럼 한곳을 섬세하게 밝히는 기운', season:'여름', keywords:['집중','섬세함','온기'] },
    { id:'mu', char:'戊', name:'무토', label:'무', element:'토', polarity:'양', nature:'산과 대지처럼 중심을 잡고 버티는 기운', season:'환절기', keywords:['안정','중심','수용'] },
    { id:'gi', char:'己', name:'기토', label:'기', element:'토', polarity:'음', nature:'밭과 흙처럼 다듬고 길러내는 기운', season:'환절기', keywords:['관리','배양','실용'] },
    { id:'gyeong', char:'庚', name:'경금', label:'경', element:'금', polarity:'양', nature:'큰 쇠처럼 결단하고 형태를 만드는 기운', season:'가을', keywords:['결단','정리','실행'] },
    { id:'sin', char:'辛', name:'신금', label:'신', element:'금', polarity:'음', nature:'보석과 세공된 금속처럼 정교한 기운', season:'가을', keywords:['정교함','기준','완성'] },
    { id:'im', char:'壬', name:'임수', label:'임', element:'수', polarity:'양', nature:'큰 강과 바다처럼 넓게 흐르는 기운', season:'겨울', keywords:['흐름','확장','지혜'] },
    { id:'gye', char:'癸', name:'계수', label:'계', element:'수', polarity:'음', nature:'비와 이슬처럼 스며들고 모이는 기운', season:'겨울', keywords:['관찰','응축','섬세함'] }
  ];

  const branches = [
    { id:'ja', char:'子', name:'자수', label:'자', element:'수', polarity:'양', season:'겨울', month:'음력 11월 무렵', hidden:'癸' },
    { id:'chuk', char:'丑', name:'축토', label:'축', element:'토', polarity:'음', season:'겨울', month:'음력 12월 무렵', hidden:'己·癸·辛' },
    { id:'in', char:'寅', name:'인목', label:'인', element:'목', polarity:'양', season:'봄', month:'음력 1월 무렵', hidden:'甲·丙·戊' },
    { id:'myo', char:'卯', name:'묘목', label:'묘', element:'목', polarity:'음', season:'봄', month:'음력 2월 무렵', hidden:'乙' },
    { id:'jin', char:'辰', name:'진토', label:'진', element:'토', polarity:'양', season:'봄', month:'음력 3월 무렵', hidden:'戊·乙·癸' },
    { id:'sa', char:'巳', name:'사화', label:'사', element:'화', polarity:'음', season:'여름', month:'음력 4월 무렵', hidden:'丙·戊·庚' },
    { id:'o', char:'午', name:'오화', label:'오', element:'화', polarity:'양', season:'여름', month:'음력 5월 무렵', hidden:'丁·己' },
    { id:'mi', char:'未', name:'미토', label:'미', element:'토', polarity:'음', season:'여름', month:'음력 6월 무렵', hidden:'己·丁·乙' },
    { id:'sin_b', char:'申', name:'신금', label:'신', element:'금', polarity:'양', season:'가을', month:'음력 7월 무렵', hidden:'庚·壬·戊' },
    { id:'yu', char:'酉', name:'유금', label:'유', element:'금', polarity:'음', season:'가을', month:'음력 8월 무렵', hidden:'辛' },
    { id:'sul', char:'戌', name:'술토', label:'술', element:'토', polarity:'양', season:'가을', month:'음력 9월 무렵', hidden:'戊·辛·丁' },
    { id:'hae', char:'亥', name:'해수', label:'해', element:'수', polarity:'음', season:'겨울', month:'음력 10월 무렵', hidden:'壬·甲' }
  ];

  const tenGods = [
    { id:'bigyeon', name:'비견', group:'비겁', core:'나와 같은 오행·같은 음양', meaning:'자기주도, 동료, 독립성', compare:'겁재는 같은 오행이지만 음양이 다릅니다.' },
    { id:'geopjae', name:'겁재', group:'비겁', core:'나와 같은 오행·다른 음양', meaning:'경쟁, 협력, 관계 속 주도권', compare:'비견은 같은 오행이면서 음양도 같습니다.' },
    { id:'siksin', name:'식신', group:'식상', core:'내가 생하는 오행·같은 음양', meaning:'생산, 표현, 꾸준한 결과', compare:'상관은 내가 생하지만 음양이 다릅니다.' },
    { id:'sanggwan', name:'상관', group:'식상', core:'내가 생하는 오행·다른 음양', meaning:'창의적 표현, 비판, 틀의 변화', compare:'식신은 같은 식상이지만 음양이 같습니다.' },
    { id:'pyeonjae', name:'편재', group:'재성', core:'내가 극하는 오행·같은 음양', meaning:'유동적 자원, 사업 기회, 활동성', compare:'정재는 내가 극하지만 음양이 다릅니다.' },
    { id:'jeongjae', name:'정재', group:'재성', core:'내가 극하는 오행·다른 음양', meaning:'지속적 자원, 관리, 현실성', compare:'편재는 같은 재성이지만 음양이 같습니다.' },
    { id:'pyeongwan', name:'편관', group:'관성', core:'나를 극하는 오행·같은 음양', meaning:'압박, 경쟁, 통제, 돌파', compare:'정관은 나를 극하지만 음양이 다릅니다.' },
    { id:'jeonggwan', name:'정관', group:'관성', core:'나를 극하는 오행·다른 음양', meaning:'규칙, 책임, 조직, 역할', compare:'편관은 같은 관성이지만 음양이 같습니다.' },
    { id:'pyeonin', name:'편인', group:'인성', core:'나를 생하는 오행·같은 음양', meaning:'직관적 학습, 탐구, 독특한 관점', compare:'정인은 나를 생하지만 음양이 다릅니다.' },
    { id:'jeongin', name:'정인', group:'인성', core:'나를 생하는 오행·다른 음양', meaning:'보호, 학습, 문서, 수용', compare:'편인은 같은 인성이지만 음양이 같습니다.' }
  ];

  const elements = [
    { id:'wood', char:'木', name:'목', relation:'성장하고 뻗는 기운', season:'봄', keywords:['성장','시작','확장'] },
    { id:'fire', char:'火', name:'화', relation:'밝히고 확산하는 기운', season:'여름', keywords:['표현','열기','확산'] },
    { id:'earth', char:'土', name:'토', relation:'받아들이고 중재하는 기운', season:'환절기', keywords:['중심','전환','안정'] },
    { id:'metal', char:'金', name:'금', relation:'정리하고 결실을 맺는 기운', season:'가을', keywords:['결단','정리','기준'] },
    { id:'water', char:'水', name:'수', relation:'흐르고 저장하는 기운', season:'겨울', keywords:['저장','지혜','유연'] }
  ];

  const relations = [
    { id:'cheongan-hap', char:'合', name:'천간합', core:'갑기·을경·병신·정임·무계', note:'두 천간이 짝을 이루는 관계입니다. 합이 곧 좋은 결과를 뜻하지는 않습니다.' },
    { id:'yukhap', char:'六合', name:'지지 육합', core:'자축·인해·묘술·진유·사신·오미', note:'두 지지가 짝을 이루는 관계입니다.' },
    { id:'samhap', char:'三合', name:'삼합', core:'신자진·해묘미·인오술·사유축', note:'세 지지가 특정 오행의 흐름을 이루는 관계입니다.' },
    { id:'chung', char:'沖', name:'충', core:'자오·축미·인신·묘유·진술·사해', note:'서로 마주하며 변화와 움직임을 만드는 관계로 봅니다. 무조건 흉으로 단정하지 않습니다.' },
    { id:'hyeong', char:'刑', name:'형', core:'인사신·축술미·자묘·진진·오오·유유·해해', note:'긴장과 조정이 필요한 관계로 설명하지만 세부 적용은 관점 차이가 있습니다.' },
    { id:'pa', char:'破', name:'파', core:'자유·축진·인해·묘오·사신·미술', note:'관계의 균열이나 조정으로 해석되지만 단독으로 결과를 단정하지 않습니다.' },
    { id:'hae-rel', char:'害', name:'해', core:'자미·축오·인사·묘진·신해·유술', note:'불편이나 방해의 관계로 보되 전체 원국과 함께 판단합니다.' }
  ];

  const categories = [
    {id:'elements', name:'음양오행'}, {id:'stems', name:'천간'}, {id:'branches', name:'지지'},
    {id:'tenGods', name:'십성'}, {id:'relations', name:'합충형파해'}
  ];

  const elementFlow = { 목:'화', 화:'토', 토:'금', 금:'수', 수:'목' };
  const elementControl = { 목:'토', 화:'금', 토:'수', 금:'목', 수:'화' };

  function tenGod(day, target) {
    const samePolarity = day.polarity === target.polarity;
    if (day.element === target.element) return samePolarity ? '비견' : '겁재';
    if (elementFlow[day.element] === target.element) return samePolarity ? '식신' : '상관';
    if (elementControl[day.element] === target.element) return samePolarity ? '편재' : '정재';
    if (elementControl[target.element] === day.element) return samePolarity ? '편관' : '정관';
    return samePolarity ? '편인' : '정인';
  }

  const questions = [];
  const add = q => questions.push(q);
  const rotate = (arr, n) => arr.slice(n).concat(arr.slice(0,n));
  stems.forEach((s, i) => {
    const distractors = rotate(stems, i + 2).filter(x => x.element !== s.element || x.polarity !== s.polarity).slice(0,3);
    const opts = [{text:`${s.element} · ${s.polarity}`, why:`${s.char} ${s.label}은 ${s.polarity}${s.element}입니다.`}, ...distractors.map(x=>({text:`${x.element} · ${x.polarity}`, why:`${x.element}·${x.polarity}은 ${x.char} ${x.label}의 속성입니다.`}))];
    add({ id:`stem-attr-${s.id}`, level:'초급', category:'천간', conceptIds:[s.id], type:'기초 규칙', question:`${s.char}(${s.label})의 오행과 음양은 무엇일까요?`, options:opts, answer:0,
      explanation:{core:`${s.char} ${s.name}은 ${s.polarity}의 ${s.element} 기운입니다.`, reason:`천간은 오행과 음양을 함께 기억해야 이후 십성을 정확히 계산할 수 있습니다.`, compare:`같은 ${s.element}인 ${stems.find(x=>x.element===s.element && x.polarity!==s.polarity).char}은 ${stems.find(x=>x.element===s.element && x.polarity!==s.polarity).polarity}${s.element}입니다.`}});
  });
  branches.forEach((b, i) => {
    const other = [...new Map(rotate(branches, i+3).filter(x=>x.element!==b.element).map(x=>[x.element,x])).values()].slice(0,3);
    add({ id:`branch-element-${b.id}`, level:'초급', category:'지지', conceptIds:[b.id], type:'기초 규칙', question:`${b.char}(${b.label})의 대표 오행은 무엇일까요?`, options:[b,...other].map(x=>({text:x.element, why:`${x.char}(${x.label})의 대표 오행은 ${x.element}입니다.`})), answer:0,
      explanation:{core:`${b.char} ${b.name}는 ${b.element}의 기운을 대표합니다.`, reason:`지지 ${b.label}의 기본 오행을 묻는 문제이므로 ${b.element}이 정답입니다.`, compare:`지지는 내부에 지장간을 품고 있어 실제 해석에서는 대표 오행 하나만으로 단정하지 않습니다.`}});
  });
  const pairs = [[0,3],[0,5],[0,7],[0,9],[2,5],[4,9],[6,1],[8,3],[9,6],[7,2],[1,8],[3,4]];
  pairs.forEach(([d,t], i) => {
    const day=stems[d], target=stems[t], answer=tenGod(day,target); const correct=tenGods.find(x=>x.name===answer);
    const pool=tenGods.filter(x=>x.name!==answer); const distract=[pool[(i+2)%pool.length],pool[(i+5)%pool.length],pool[(i+7)%pool.length]];
    add({id:`tengod-${day.id}-${target.id}`,level:'초급',category:'십성',conceptIds:[day.id,target.id,correct.id],type:'관계 계산',question:`${day.char}${day.name}을 일간으로 볼 때 ${target.char}${target.name}은 어떤 십성일까요?`,options:[correct,...distract].map(x=>({text:x.name,why:`${x.name}: ${x.core}`})),answer:0,
      explanation:{core:`${answer}은 ${correct.core}의 관계입니다.`,reason:`${day.element}인 일간과 ${target.element}의 생극 관계를 먼저 찾고, 두 글자의 음양이 ${day.polarity===target.polarity?'같다':'다르다'}는 점을 적용하면 ${answer}입니다.`,compare:`${correct.compare}`}});
  });

  stems.forEach((s,i)=>{
    const other=rotate(stems,i+3).filter(x=>x.id!==s.id).slice(0,3);
    add({id:`stem-reverse-${s.id}`,level:'초급',category:'천간',conceptIds:[s.id],type:'역방향 문제',question:`${s.polarity}${s.element}에 해당하는 천간은 무엇일까요?`,options:[s,...other].map(x=>({text:`${x.char}(${x.label})`,why:`${x.char}은 ${x.polarity}${x.element}입니다.`})),answer:0,
      explanation:{core:`${s.polarity}${s.element}은 ${s.char}(${s.label})입니다.`,reason:`오행이 ${s.element}이고 음양이 ${s.polarity}인 천간을 함께 찾으면 ${s.char}입니다.`,compare:`같은 ${s.element}의 짝은 ${stems.find(x=>x.element===s.element&&x.id!==s.id).char}이지만 음양이 다릅니다.`}});
  });
  branches.forEach((b,i)=>{
    const other=[...new Map(rotate(branches,i+4).filter(x=>x.season!==b.season).map(x=>[x.season,x])).values()].slice(0,3);
    add({id:`branch-season-${b.id}`,level:'초급',category:'지지',conceptIds:[b.id],type:'계절 찾기',question:`${b.char}(${b.label})가 속하는 계절은?`,options:[b,...other].map(x=>({text:x.season,why:`${x.char}(${x.label})는 ${x.season}의 지지입니다.`})),answer:0,
      explanation:{core:`${b.char}(${b.label})는 ${b.season}의 흐름에 속합니다.`,reason:`월지의 계절 구분을 적용하면 ${b.char}은 ${b.season}입니다.`,compare:'계절은 신강·신약과 조후를 살필 때 중요한 출발점이지만 계절 하나로 원국 전체를 단정하지 않습니다.'}});
    const hiddenOther=rotate(branches,i+2).filter(x=>x.hidden!==b.hidden).slice(0,3);
    add({id:`hidden-${b.id}`,level:'초급',category:'지지',conceptIds:[b.id],type:'지장간',question:`${b.char}(${b.label}) 안에 들어 있는 지장간은?`,options:[b,...hiddenOther].map(x=>({text:x.hidden,why:`${x.hidden}은 ${x.char}(${x.label})의 지장간입니다.`})),answer:0,
      explanation:{core:`${b.char}의 지장간은 ${b.hidden}입니다.`,reason:'지지는 대표 오행 외에도 내부에 천간의 기운을 품고 있으므로 해당 지장간 구성을 찾습니다.',compare:'초급에서는 구성 확인에 집중하고, 실제 힘과 작용은 계절·투간·주변 관계를 함께 살펴야 합니다.'}});
  });
  stems.forEach((day,i)=>{
    const wanted=tenGods[i]; const target=stems.find(s=>tenGod(day,s)===wanted.name);
    const distract=rotate(stems,i+2).filter(s=>s.id!==target.id).slice(0,3);
    add({id:`tengod-reverse-${day.id}-${wanted.id}`,level:'초급',category:'십성',conceptIds:[day.id,target.id,wanted.id],type:'역방향 문제',question:`${day.char}${day.name}에게 ${wanted.name}이 되는 천간은?`,options:[target,...distract].map(x=>({text:`${x.char}${x.name}`,why:`${day.char} 일간에게 ${x.char}은 ${tenGod(day,x)}입니다.`})),answer:0,
      explanation:{core:`${day.char} 일간의 ${wanted.name}은 ${target.char}${target.name}입니다.`,reason:`${wanted.core}이라는 조건을 ${day.element}인 일간에 적용하면 ${target.polarity}${target.element}인 ${target.char}을 찾을 수 있습니다.`,compare:`같은 ${target.element}이라도 음양이 바뀌면 짝이 되는 십성이 달라집니다.`}});
  });

  [
    ['relation-yukhap-in-hae','寅(인)과 亥(해)','육합','인해는 지지 육합입니다.','인신은 충, 인해는 파로도 분류되어 실제 적용은 전체 구조를 함께 봅니다.'],
    ['relation-chung-myo-yu','卯(묘)와 酉(유)','충','묘유는 서로 마주하는 지지 충입니다.','묘술은 육합, 묘오는 파, 묘진은 해입니다.'],
    ['relation-hae-yu-sul','酉(유)와 戌(술)','해','유술은 지지 해의 짝입니다.','진유는 육합, 묘유는 충입니다.'],
    ['relation-pa-chuk-jin','丑(축)과 辰(진)','파','축진은 지지 파의 짝입니다.','축미는 충, 자축은 육합, 축오는 해입니다.'],
    ['relation-samhap-sin-ja-jin','申·子·辰','삼합','신자진은 수의 흐름을 이루는 삼합입니다.','해묘미는 목, 인오술은 화, 사유축은 금의 삼합입니다.'],
    ['relation-banghap-in-myo-jin','寅·卯·辰','방합','인묘진은 봄과 목의 방합입니다.','삼합은 계절 방향이 아닌 생·왕·고의 세 지지 조합입니다.'],
    ['relation-cheongan-eul-gyeong','乙(을)과 庚(경)','천간합','을과 경은 천간합의 짝입니다.','을신은 천간충으로 보는 기본 짝입니다.'],
    ['relation-cheongan-byeong-im','丙(병)과 壬(임)','천간충','병과 임은 천간충의 짝입니다.','병신은 천간합의 짝입니다.'],
    ['relation-hyeong-ja-myo','子(자)와 卯(묘)','형','자묘는 형 관계로 분류합니다.','자오는 충, 자축은 육합입니다.'],
    ['relation-yukhap-jin-yu','辰(진)과 酉(유)','육합','진유는 지지 육합입니다.','진술은 충, 축진은 파, 묘진은 해입니다.']
  ].forEach((r,i)=>{
    const opts=['육합','충','형','파','해','삼합','방합','천간합','천간충'];
    const choices=[r[2],...rotate(opts,i+2).filter(x=>x!==r[2]).slice(0,3)];
    add({id:r[0],level:'초급',category:'합충형파해',conceptIds:[],type:'관계 비교',question:`${r[1]}의 관계로 가장 알맞은 것은?`,options:choices.map(x=>({text:x,why:`${x}의 기본 짝인지 관계표를 확인합니다.`})),answer:0,explanation:{core:r[3],reason:`기초 관계표에서 ${r[1]}은 ${r[2]}에 해당합니다.`,compare:r[4]}});
  });
  const curated = [
    {id:'flow-wood-fire',level:'초급',category:'음양오행',conceptIds:['wood','fire'],type:'흐름 찾기',question:'목(木)의 기운이 자연스럽게 생해 주는 오행은?',options:['화','토','금','수'],answer:0,core:'목생화(木生火)',reason:'오행의 상생 순서는 목→화→토→금→수→목입니다.',compare:'목극토는 상극 관계이며, 금극목과 수생목은 방향이 다릅니다.'},
    {id:'control-metal-wood',level:'초급',category:'음양오행',conceptIds:['metal','wood'],type:'역방향 문제',question:'다음 중 금(金)이 극하는 오행은?',options:['목','화','토','수'],answer:0,core:'금극목(金剋木)',reason:'금은 목을 제어하는 관계입니다.',compare:'토생금·금생수는 상생이며, 화극금은 금이 극을 받는 관계입니다.'},
    {id:'month-spring',level:'초급',category:'지지',conceptIds:['in','myo','jin'],type:'개념 구분',question:'봄의 흐름을 이루는 지지 묶음은?',options:['寅·卯·辰','巳·午·未','申·酉·戌','亥·子·丑'],answer:0,core:'인·묘·진은 봄의 지지입니다.',reason:'월지로 계절을 볼 때 인월에서 봄이 시작되어 묘월을 거쳐 진월로 이어집니다.',compare:'사오미는 여름, 신유술은 가을, 해자축은 겨울입니다.'},
    {id:'hidden-jin',level:'초급',category:'지지',conceptIds:['jin'],type:'지장간',question:'辰(진)의 지장간으로 알맞은 것은?',options:['戊·乙·癸','己·癸·辛','丙·戊·庚','戊·辛·丁'],answer:0,core:'진토의 지장간은 戊·乙·癸입니다.',reason:'지지는 내부에 여러 천간의 기운을 품습니다. 진에는 토·목·수의 천간이 들어 있습니다.',compare:'기계신은 축, 병무경은 사, 무신정은 술의 지장간입니다.'},
    {id:'relation-ja-o',level:'초급',category:'합충형파해',conceptIds:['chung','ja','o'],type:'관계 찾기',question:'子(자)와 午(오)의 관계는?',options:['충','육합','파','해'],answer:0,core:'자와 오는 충 관계입니다.',reason:'지지 충의 짝 중 하나가 자오충입니다.',compare:'자축은 육합, 자유는 파, 자미는 해입니다. 충을 무조건 나쁜 결과로 단정하지 않습니다.'},
    {id:'relation-gap-gi',level:'초급',category:'합충형파해',conceptIds:['cheongan-hap','gap','gi'],type:'관계 찾기',question:'甲(갑)과 己(기)의 관계는?',options:['천간합','천간충','지지 육합','삼합'],answer:0,core:'갑과 기는 천간합의 짝입니다.',reason:'천간의 다섯 합은 갑기·을경·병신·정임·무계입니다.',compare:'천간합의 존재와 실제 작용 여부는 구분해야 하며 합이라는 이유만으로 길하다고 보지 않습니다.'},
    {id:'chart-daymaster',level:'중급',category:'원국 읽기',conceptIds:['gap'],type:'원국 문제',context:'년주  丙寅\n월주  庚子\n일주  甲辰\n시주  癸酉',question:'이 명식의 일간은 무엇일까요?',options:['甲','庚','辰','子'],answer:0,core:'일간은 일주의 위쪽 천간입니다.',reason:'일주가 甲辰이므로 위 글자인 甲이 일간입니다.',compare:'庚은 월간, 辰은 일지, 子는 월지입니다.'},
    {id:'chart-monthbranch',level:'중급',category:'원국 읽기',conceptIds:['ja'],type:'원국 문제',context:'년주  丙寅\n월주  庚子\n일주  甲辰\n시주  癸酉',question:'이 명식의 월지는 무엇일까요?',options:['子','庚','辰','酉'],answer:0,core:'월지는 월주의 아래쪽 지지입니다.',reason:'월주가 庚子이므로 아래 글자인 子가 월지입니다.',compare:'庚은 월간, 辰은 일지, 酉는 시지입니다.'},
    {id:'chart-resource',level:'중급',category:'원국 읽기',conceptIds:['gap','gye','jeongin'],type:'원국 문제',context:'년주  丙寅\n월주  庚子\n일주  甲辰\n시주  癸酉',question:'甲 일간을 기준으로 시주 천간 癸의 십성은?',options:['정인','편인','정관','상관'],answer:0,core:'甲 일간에게 癸는 정인입니다.',reason:'수는 목을 생하므로 인성이고, 양인 甲과 음인 癸는 음양이 달라 정인이 됩니다.',compare:'壬은 같은 수이지만 甲과 음양이 같아 편인입니다.'},
    {id:'interpret-balance',level:'고급',category:'상담',conceptIds:['jeongjae','pyeonjae'],type:'가장 적절한 해석',context:'한 원국에서 재성이 여러 곳에 보입니다. 내담자는 “저는 반드시 큰돈을 벌 사주인가요?”라고 묻습니다.',question:'학습 원칙에 가장 맞는 답변은?',options:['재성의 강약·위치·주변 관계와 운을 함께 봐야 하므로 큰돈을 번다고 단정할 수 없습니다.','재성이 많으니 반드시 부자가 됩니다.','재성은 돈만 뜻하므로 직업과는 관계없습니다.','편재가 하나라도 있으면 사업을 해야 합니다.'],answer:0,core:'십성 하나만으로 사건이나 결과를 단정하지 않습니다.',reason:'재성은 자원과 현실 관리 등의 해석 근거지만 실제 양상은 원국 전체와 운, 현실 조건을 함께 살펴야 합니다.',compare:'나머지 보기는 재성의 개수나 존재만으로 결과와 직업을 단정하고 있습니다.'}
  ];
  curated.forEach(q=>add({...q,options:q.options.map((x,i)=>typeof x==='string'?{text:x,why:i===q.answer?q.reason:q.compare}:x),explanation:{core:q.core,reason:q.reason,compare:q.compare}}));

  return {stems,branches,tenGods,elements,relations,categories,questions,tenGod};
})();
