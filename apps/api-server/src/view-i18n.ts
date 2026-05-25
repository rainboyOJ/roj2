// 这个文件集中管理页面文案和视图辅助函数。
// 目前支持中英双语，Pug 模板里看到的 t()/localize*() 都从这里来。
export type UiLang = 'zh' | 'en';

type TranslationKey =
  | 'site.tagline'
  | 'nav.home'
  | 'nav.problems'
  | 'nav.submissions'
  | 'nav.ranklist'
  | 'nav.contests'
  | 'nav.profile'
  | 'nav.logout'
  | 'nav.login'
  | 'nav.register'
  | 'nav.admin'
  | 'nav.admin.users'
  | 'nav.admin.problems'
  | 'nav.admin.submissions'
  | 'nav.admin.languages'
  | 'lang.zh'
  | 'lang.en'
  | 'home.title'
  | 'home.lead'
  | 'home.description'
  | 'home.start.title'
  | 'home.start.body'
  | 'home.start.cta'
  | 'home.results.title'
  | 'home.results.body'
  | 'home.results.cta'
  | 'home.rankings.title'
  | 'home.rankings.body'
  | 'home.rankings.cta'
  | 'home.quickLinks'
  | 'home.learningFlow'
  | 'home.flow.step1'
  | 'home.flow.step2'
  | 'home.flow.step3'
  | 'home.flow.step4'
  | 'problems.title'
  | 'problems.lead'
  | 'problems.openSubmissionList'
  | 'problems.login'
  | 'problems.itemLead'
  | 'problems.pid'
  | 'problems.problem'
  | 'problems.languages'
  | 'problems.action'
  | 'problems.submit'
  | 'problems.empty'
  | 'problem.lead'
  | 'problem.statement'
  | 'problem.submit'
  | 'problem.workflow'
  | 'problem.language'
  | 'problem.sourceCode'
  | 'problem.placeholder'
  | 'problem.backToProblems'
  | 'submissions.title'
  | 'submissions.lead'
  | 'submissions.problemList'
  | 'submissions.itemLead'
  | 'submissions.status'
  | 'submissions.judge'
  | 'submissions.submissionId'
  | 'submissions.user'
  | 'submissions.problem'
  | 'submissions.language'
  | 'submissions.verdict'
  | 'submissions.action'
  | 'submissions.details'
  | 'submissions.empty'
  | 'submission.title'
  | 'submission.lead'
  | 'submission.status'
  | 'submission.verdict'
  | 'submission.judgeStatus'
  | 'submission.info'
  | 'submission.user'
  | 'submission.problem'
  | 'submission.language'
  | 'submission.sourceCode'
  | 'submission.waiting'
  | 'submission.judgeMessage'
  | 'submission.caseResults'
  | 'submission.caseResultsLead'
  | 'submission.caseSeq'
  | 'submission.caseVerdict'
  | 'submission.caseCpu'
  | 'submission.caseReal'
  | 'submission.caseMemory'
  | 'submission.caseExit'
  | 'submission.caseSignal'
  | 'submission.caseError'
  | 'submission.noCaseResults'
  | 'submission.backToSubmissions'
  | 'submission.openProblems'
  | 'ranklist.title'
  | 'ranklist.lead'
  | 'ranklist.rank'
  | 'ranklist.user'
  | 'ranklist.accepted'
  | 'ranklist.totalSubmissions'
  | 'ranklist.lastAc'
  | 'ranklist.noData'
  | 'ranklist.na'
  | 'contests.title'
  | 'contests.lead'
  | 'contests.start'
  | 'contests.end'
  | 'contests.name'
  | 'contests.status'
  | 'contests.action'
  | 'contests.open'
  | 'contests.empty'
  | 'contest.status'
  | 'contest.start'
  | 'contest.end'
  | 'contest.aboutTitle'
  | 'contest.aboutBody'
  | 'login.title'
  | 'login.lead'
  | 'login.username'
  | 'login.password'
  | 'login.usernamePlaceholder'
  | 'login.passwordPlaceholder'
  | 'login.submit'
  | 'login.createAccount'
  | 'register.title'
  | 'register.lead'
  | 'register.username'
  | 'register.name'
  | 'register.gender'
  | 'register.grade'
  | 'register.className'
  | 'register.password'
  | 'register.usernamePlaceholder'
  | 'register.namePlaceholder'
  | 'register.genderPlaceholder'
  | 'register.gradePlaceholder'
  | 'register.classNamePlaceholder'
  | 'register.passwordPlaceholder'
  | 'register.submit'
  | 'register.backToLogin'
  | 'profile.title'
  | 'profile.lead'
  | 'profile.username'
  | 'profile.role'
  | 'profile.approval'
  | 'admin.users.title'
  | 'admin.users.lead'
  | 'admin.users.noDisplayName'
  | 'admin.users.username'
  | 'admin.users.name'
  | 'admin.users.role'
  | 'admin.users.approval'
  | 'admin.users.actions'
  | 'admin.users.select'
  | 'admin.users.approve'
  | 'admin.users.reject'
  | 'admin.users.bulkApprove'
  | 'admin.users.bulkReject'
  | 'admin.users.empty'
  | 'admin.dashboard.title'
  | 'admin.dashboard.lead'
  | 'admin.dashboard.problemsTitle'
  | 'admin.dashboard.problemsBody'
  | 'admin.dashboard.openProblems'
  | 'admin.dashboard.createProblem'
  | 'admin.dashboard.usersTitle'
  | 'admin.dashboard.usersBody'
  | 'admin.dashboard.openUsers'
  | 'admin.dashboard.submissionsTitle'
  | 'admin.dashboard.submissionsBody'
  | 'admin.dashboard.openSubmissions'
  | 'admin.dashboard.languagesTitle'
  | 'admin.dashboard.languagesBody'
  | 'admin.dashboard.openLanguages'
  | 'admin.problems.title'
  | 'admin.problems.lead'
  | 'admin.problems.create'
  | 'admin.problems.pid'
  | 'admin.problems.titleColumn'
  | 'admin.problems.languages'
  | 'admin.problems.visibility'
  | 'admin.problems.action'
  | 'admin.problems.edit'
  | 'admin.problems.publish'
  | 'admin.problems.empty'
  | 'admin.submissions.title'
  | 'admin.submissions.lead'
  | 'admin.submissions.submissionId'
  | 'admin.submissions.user'
  | 'admin.submissions.problem'
  | 'admin.submissions.language'
  | 'admin.submissions.status'
  | 'admin.submissions.judge'
  | 'admin.submissions.verdict'
  | 'admin.submissions.action'
  | 'admin.submissions.empty'
  | 'admin.problemForm.createTitle'
  | 'admin.problemForm.createLead'
  | 'admin.problemForm.editTitle'
  | 'admin.problemForm.editLead'
  | 'admin.problemForm.pid'
  | 'admin.problemForm.title'
  | 'admin.problemForm.statement'
  | 'admin.problemForm.languages'
  | 'admin.problemForm.visible'
  | 'admin.problemForm.hidden'
  | 'admin.problemForm.visibleOption'
  | 'admin.problemForm.save'
  | 'admin.problemForm.back'
  | 'admin.problemForm.publish'
  | 'admin.languages.title'
  | 'admin.languages.lead'
  | 'admin.languages.enabled'
  | 'admin.languages.save'
  | 'admin.languages.back'
  | 'status.pending'
  | 'status.approved'
  | 'status.rejected'
  | 'status.visible'
  | 'status.hidden'
  | 'contestStatus.Upcoming'
  | 'contestStatus.Open Practice'
  | 'contestStatus.Running'
  | 'contestStatus.Finished'
  | 'submissionStatus.PENDING_DISPATCH'
  | 'submissionStatus.SENT_TO_JUDGE'
  | 'submissionStatus.JUDGING'
  | 'submissionStatus.FINISHED'
  | 'submissionStatus.FAILED'
  | 'judgeStatus.QUEUED'
  | 'judgeStatus.PREPARING'
  | 'judgeStatus.COMPILING'
  | 'judgeStatus.RUNNING'
  | 'judgeStatus.FINISHED'
  | 'judgeStatus.FAILED'
  | 'verdict.PENDING'
  | 'verdict.AC'
  | 'verdict.WA'
  | 'verdict.TLE'
  | 'verdict.MLE'
  | 'verdict.RE'
  | 'verdict.OLE'
  | 'verdict.PE'
  | 'verdict.CE'
  | 'verdict.UNKNOWN'
  | 'verdict.SYSTEM_ERROR'
  | 'role.student'
  | 'role.admin';

type TranslationMap = Record<TranslationKey, string>;

const translations: Record<UiLang, TranslationMap> = {
  zh: {
    'site.tagline': '简单学校 OJ',
    'nav.home': '首页',
    'nav.problems': '题目',
    'nav.submissions': '提交',
    'nav.ranklist': '排行榜',
    'nav.contests': '比赛',
    'nav.profile': '个人中心',
    'nav.logout': '登出',
    'nav.login': '登录',
    'nav.register': '注册',
    'nav.admin': '管理',
    'nav.admin.users': '用户',
    'nav.admin.problems': '题目管理',
    'nav.admin.submissions': '提交管理',
    'nav.admin.languages': '语言设置',
    'lang.zh': '中文',
    'lang.en': 'English',
    'home.title': '学校 OJ 练习平台',
    'home.lead': '一个适合教学场景的简洁在线评测工作区，用来读题、交题和查看结果。',
    'home.description': '这个站点面向学习使用：导航简单、页面清晰，常见 OJ 操作可以直接进入。',
    'home.start.title': '开始做题',
    'home.start.body': '打开题目列表，选择一道题，然后提交 Python 或 C++ 代码。',
    'home.start.cta': '进入题目列表',
    'home.results.title': '查看结果',
    'home.results.body': '回到提交记录页面，持续跟踪评测，直到出现最终结果。',
    'home.results.cta': '查看提交记录',
    'home.rankings.title': '查看排行',
    'home.rankings.body': '打开一个经典 OJ 风格的简洁排行榜页面。',
    'home.rankings.cta': '打开排行榜',
    'home.quickLinks': '常用入口',
    'home.learningFlow': '学习流程',
    'home.flow.step1': '先阅读题面。',
    'home.flow.step2': '先写出一个小而正确的程序。',
    'home.flow.step3': '提交后查看评测结果。',
    'home.flow.step4': '根据结果继续修改重试。',
    'problems.title': '题目列表',
    'problems.lead': '浏览公开题目，打开题面，并在详情页提交代码。',
    'problems.openSubmissionList': '提交列表',
    'problems.login': '登录',
    'problems.itemLead': '你可以随时在这里提交代码、查看结果、重新练习这道题。',
    'problems.pid': '题号',
    'problems.problem': '题目',
    'problems.languages': '支持语言',
    'problems.action': '操作',
    'problems.submit': '提交代码',
    'problems.empty': '目前还没有可见题目。',
    'problem.lead': '阅读题面，选择支持的语言，并在下方提交解答。',
    'problem.statement': '题面',
    'problem.submit': '提交代码',
    'problem.workflow': '这里保持常见 OJ 的交题流程。',
    'problem.language': '语言',
    'problem.sourceCode': '源代码',
    'problem.placeholder': '在这里编写你的解答',
    'problem.backToProblems': '返回题目列表',
    'submissions.title': '提交列表',
    'submissions.lead': '查看最近的评测记录，并重新打开任意提交查看详情。',
    'submissions.problemList': '题目列表',
    'submissions.itemLead': '从排队到最终判定，都可以在这里追踪这次提交。',
    'submissions.status': '状态',
    'submissions.judge': '评测机',
    'submissions.submissionId': '提交号',
    'submissions.user': '用户',
    'submissions.problem': '题目',
    'submissions.language': '语言',
    'submissions.verdict': '结果',
    'submissions.action': '操作',
    'submissions.details': '查看详情',
    'submissions.empty': '还没有提交记录。',
    'submission.title': '提交',
    'submission.lead': '评测尚未结束时，这个页面会自动刷新。',
    'submission.status': '状态',
    'submission.verdict': '结果',
    'submission.judgeStatus': '评测机状态',
    'submission.info': '提交信息',
    'submission.user': '提交用户',
    'submission.problem': '题目',
    'submission.language': '语言',
    'submission.sourceCode': '提交代码',
    'submission.waiting': '等待中',
    'submission.judgeMessage': '评测信息',
    'submission.caseResults': '测试点结果',
    'submission.caseResultsLead': '逐个测试点查看判定、耗时、内存和退出信息。',
    'submission.caseSeq': '测试点',
    'submission.caseVerdict': '结果',
    'submission.caseCpu': 'CPU',
    'submission.caseReal': '实际时间',
    'submission.caseMemory': '内存',
    'submission.caseExit': '退出码',
    'submission.caseSignal': '信号',
    'submission.caseError': '错误码',
    'submission.noCaseResults': '评测机还没有返回测试点结果。',
    'submission.backToSubmissions': '返回提交列表',
    'submission.openProblems': '打开题目列表',
    'ranklist.title': '排行榜',
    'ranklist.lead': '一个简化的学校 OJ 排行榜，按通过题数和最近通过时间展示。',
    'ranklist.rank': '排名',
    'ranklist.user': '用户',
    'ranklist.accepted': '通过题数',
    'ranklist.totalSubmissions': '总提交数',
    'ranklist.lastAc': '最近 AC',
    'ranklist.noData': '暂无排行数据。',
    'ranklist.na': '暂无',
    'contests.title': '比赛列表',
    'contests.lead': '常见 OJ 一般都会有比赛入口，所以这里先提供一个结构化的比赛页。',
    'contests.start': '开始',
    'contests.end': '结束',
    'contests.name': '比赛名称',
    'contests.status': '状态',
    'contests.action': '操作',
    'contests.open': '打开比赛页面',
    'contests.empty': '暂时还没有比赛。',
    'contest.status': '状态',
    'contest.start': '开始时间',
    'contest.end': '结束时间',
    'contest.aboutTitle': '关于这个页面',
    'contest.aboutBody': '这是第一阶段的比赛页面外壳。现在先把 OJ 的比赛导航结构补齐，之后再继续加入规则、榜单和更多比赛行为。',
    'login.title': '账号登录',
    'login.lead': '登录后可以提交代码、查看历史记录，并访问常用 OJ 页面。',
    'login.username': '用户名',
    'login.password': '密码',
    'login.usernamePlaceholder': 'demo',
    'login.passwordPlaceholder': '输入你的密码',
    'login.submit': '登录',
    'login.createAccount': '创建账号',
    'register.title': '学生注册',
    'register.lead': '创建一个供班级使用的基础账号，必要时等待管理员审核。',
    'register.username': '用户名',
    'register.name': '姓名',
    'register.gender': '性别',
    'register.grade': '年级',
    'register.className': '班级',
    'register.password': '密码',
    'register.usernamePlaceholder': 'student_01',
    'register.namePlaceholder': '你的姓名',
    'register.genderPlaceholder': 'male / female / other',
    'register.gradePlaceholder': '2025',
    'register.classNamePlaceholder': '1 班',
    'register.passwordPlaceholder': '至少 8 个字符',
    'register.submit': '注册',
    'register.backToLogin': '返回登录',
    'profile.title': '个人中心',
    'profile.lead': '当前用户的基础账号信息。',
    'profile.username': '用户名',
    'profile.role': '角色',
    'profile.approval': '审核状态',
    'admin.users.title': '用户管理',
    'admin.users.lead': '查看当前账号列表和审核状态。',
    'admin.users.noDisplayName': '没有显示姓名',
    'admin.users.username': '用户名',
    'admin.users.name': '姓名',
    'admin.users.role': '角色',
    'admin.users.approval': '审核状态',
    'admin.users.actions': '审核操作',
    'admin.users.select': '选择',
    'admin.users.approve': '通过',
    'admin.users.reject': '拒绝',
    'admin.users.bulkApprove': '批量通过',
    'admin.users.bulkReject': '批量拒绝',
    'admin.users.empty': '没有需要查看的用户。',
    'admin.dashboard.title': '管理后台',
    'admin.dashboard.lead': '集中进入题目、用户和提交管理，不需要记住各个后台 URL。',
    'admin.dashboard.problemsTitle': '题目管理',
    'admin.dashboard.problemsBody': '创建、编辑、发布题目，并维护题面和支持语言。',
    'admin.dashboard.openProblems': '打开题目管理',
    'admin.dashboard.createProblem': '创建题目',
    'admin.dashboard.usersTitle': '用户审核',
    'admin.dashboard.usersBody': '查看注册用户，批量通过或拒绝学生账号。',
    'admin.dashboard.openUsers': '打开用户管理',
    'admin.dashboard.submissionsTitle': '提交管理',
    'admin.dashboard.submissionsBody': '查看全站提交记录，追踪评测状态和最终结果。',
    'admin.dashboard.openSubmissions': '打开提交管理',
    'admin.dashboard.languagesTitle': '语言开关',
    'admin.dashboard.languagesBody': '控制整个 OJ 当前允许用户提交的编程语言集合。',
    'admin.dashboard.openLanguages': '打开语言设置',
    'admin.problems.title': '题目管理',
    'admin.problems.lead': '按 OJ 管理员常见的方式浏览和维护题目目录。',
    'admin.problems.create': '创建题目',
    'admin.problems.pid': '题号',
    'admin.problems.titleColumn': '标题',
    'admin.problems.languages': '支持语言',
    'admin.problems.visibility': '可见性',
    'admin.problems.action': '操作',
    'admin.problems.edit': '编辑',
    'admin.problems.publish': '发布',
    'admin.problems.empty': '当前还没有题目。',
    'admin.submissions.title': '提交管理',
    'admin.submissions.lead': '用标准列表视图查看所有提交的评测活动。',
    'admin.submissions.submissionId': '提交号',
    'admin.submissions.user': '用户',
    'admin.submissions.problem': '题目',
    'admin.submissions.language': '语言',
    'admin.submissions.status': '状态',
    'admin.submissions.judge': '评测机',
    'admin.submissions.verdict': '结果',
    'admin.submissions.action': '操作',
    'admin.submissions.empty': '还没有提交记录。',
    'admin.problemForm.createTitle': '创建题目',
    'admin.problemForm.createLead': '为 OJ 新增一道题目的基础信息。',
    'admin.problemForm.editTitle': '编辑题目',
    'admin.problemForm.editLead': '修改现有题目的标题、题面、语言和可见性。',
    'admin.problemForm.pid': '题号',
    'admin.problemForm.title': '标题',
    'admin.problemForm.statement': '题面',
    'admin.problemForm.languages': '支持语言',
    'admin.problemForm.visible': '可见性',
    'admin.problemForm.hidden': '隐藏',
    'admin.problemForm.visibleOption': '可见',
    'admin.problemForm.save': '保存题目',
    'admin.problemForm.back': '返回',
    'admin.problemForm.publish': '发布题目',
    'admin.languages.title': '语言设置',
    'admin.languages.lead': '控制全站哪些编程语言对用户可见且允许提交。',
    'admin.languages.enabled': '启用语言',
    'admin.languages.save': '保存设置',
    'admin.languages.back': '返回管理后台',
    'status.pending': '待审核',
    'status.approved': '已通过',
    'status.rejected': '已拒绝',
    'status.visible': '可见',
    'status.hidden': '隐藏',
    'contestStatus.Upcoming': '即将开始',
    'contestStatus.Open Practice': '开放练习',
    'contestStatus.Running': '进行中',
    'contestStatus.Finished': '已结束',
    'submissionStatus.PENDING_DISPATCH': '等待派发',
    'submissionStatus.SENT_TO_JUDGE': '已发送到评测机',
    'submissionStatus.JUDGING': '评测中',
    'submissionStatus.FINISHED': '已完成',
    'submissionStatus.FAILED': '评测失败',
    'judgeStatus.QUEUED': '排队中',
    'judgeStatus.PREPARING': '准备中',
    'judgeStatus.COMPILING': '编译中',
    'judgeStatus.RUNNING': '运行中',
    'judgeStatus.FINISHED': '已完成',
    'judgeStatus.FAILED': '失败',
    'verdict.PENDING': '等待中',
    'verdict.AC': 'AC',
    'verdict.WA': 'WA',
    'verdict.TLE': 'TLE',
    'verdict.MLE': 'MLE',
    'verdict.RE': 'RE',
    'verdict.OLE': 'OLE',
    'verdict.PE': 'PE',
    'verdict.CE': 'CE',
    'verdict.UNKNOWN': 'UNKNOWN',
    'verdict.SYSTEM_ERROR': '系统错误',
    'role.student': '学生',
    'role.admin': '管理员',
  },
  en: {
    'site.tagline': 'Simple school OJ',
    'nav.home': 'Home',
    'nav.problems': 'Problems',
    'nav.submissions': 'Submissions',
    'nav.ranklist': 'Ranklist',
    'nav.contests': 'Contests',
    'nav.profile': 'Profile',
    'nav.logout': 'Logout',
    'nav.login': 'Login',
    'nav.register': 'Register',
    'nav.admin': 'Admin',
    'nav.admin.users': 'Users',
    'nav.admin.problems': 'Problems',
    'nav.admin.submissions': 'Submissions',
    'nav.admin.languages': 'Languages',
    'lang.zh': '中文',
    'lang.en': 'English',
    'home.title': 'Practice for school OJ',
    'home.lead': 'A compact online judge workspace for reading problems, submitting code, and checking results.',
    'home.description': 'This site is tuned for learning use: simple navigation, clear pages, and direct access to the most common OJ workflows.',
    'home.start.title': 'Start solving',
    'home.start.body': 'Open the problem list, choose a task, and submit Python or C++ code.',
    'home.start.cta': 'Go to problems',
    'home.results.title': 'Check results',
    'home.results.body': 'Revisit your submissions and follow each judging result until it reaches a final verdict.',
    'home.results.cta': 'View submissions',
    'home.rankings.title': 'Read rankings',
    'home.rankings.body': 'Open a simple ranklist page with a classic OJ layout.',
    'home.rankings.cta': 'Open ranklist',
    'home.quickLinks': 'Quick links',
    'home.learningFlow': 'Learning flow',
    'home.flow.step1': 'Read the statement.',
    'home.flow.step2': 'Write a small correct program first.',
    'home.flow.step3': 'Submit and inspect the verdict.',
    'home.flow.step4': 'Retry based on the result.',
    'problems.title': 'Problem list',
    'problems.lead': 'Browse public problems, open a statement, and submit code from the detail page.',
    'problems.openSubmissionList': 'Submission list',
    'problems.login': 'Login',
    'problems.itemLead': 'Submit code, check verdicts, and revisit this problem anytime.',
    'problems.pid': 'PID',
    'problems.problem': 'Problem',
    'problems.languages': 'Languages',
    'problems.action': 'Action',
    'problems.submit': 'Submit code',
    'problems.empty': 'No visible problems yet.',
    'problem.lead': 'Read the statement, pick a supported language, and submit a solution below.',
    'problem.statement': 'Statement',
    'problem.submit': 'Submit code',
    'problem.workflow': 'Use the same workflow you would expect on a standard OJ page.',
    'problem.language': 'Language',
    'problem.sourceCode': 'Source code',
    'problem.placeholder': 'Write your solution here',
    'problem.backToProblems': 'Back to problem list',
    'submissions.title': 'Submission list',
    'submissions.lead': 'Review recent judging activity and reopen any submission for details.',
    'submissions.problemList': 'Problem list',
    'submissions.itemLead': 'Track the result of this submission from queued to final verdict.',
    'submissions.status': 'Status',
    'submissions.judge': 'Judge',
    'submissions.submissionId': 'Submission ID',
    'submissions.user': 'User',
    'submissions.problem': 'Problem',
    'submissions.language': 'Language',
    'submissions.verdict': 'Verdict',
    'submissions.action': 'Action',
    'submissions.details': 'Details',
    'submissions.empty': 'No submissions yet.',
    'submission.title': 'Submission',
    'submission.lead': 'This page refreshes automatically while judging is still in progress.',
    'submission.status': 'Status',
    'submission.verdict': 'Verdict',
    'submission.judgeStatus': 'Judge status',
    'submission.info': 'Submission info',
    'submission.user': 'User',
    'submission.problem': 'Problem',
    'submission.language': 'Language',
    'submission.sourceCode': 'Submitted code',
    'submission.waiting': 'Waiting',
    'submission.judgeMessage': 'Judge message',
    'submission.caseResults': 'Case results',
    'submission.caseResultsLead': 'Inspect each case verdict, timing, memory, and exit information.',
    'submission.caseSeq': 'Case',
    'submission.caseVerdict': 'Verdict',
    'submission.caseCpu': 'CPU',
    'submission.caseReal': 'Real time',
    'submission.caseMemory': 'Memory',
    'submission.caseExit': 'Exit',
    'submission.caseSignal': 'Signal',
    'submission.caseError': 'Error',
    'submission.noCaseResults': 'The judge has not returned case results yet.',
    'submission.backToSubmissions': 'Back to submission list',
    'submission.openProblems': 'Open problem list',
    'ranklist.title': 'Ranklist',
    'ranklist.lead': 'A simplified school OJ ranklist based on accepted count and recent accepted submissions.',
    'ranklist.rank': 'Rank',
    'ranklist.user': 'User',
    'ranklist.accepted': 'Accepted',
    'ranklist.totalSubmissions': 'Total submissions',
    'ranklist.lastAc': 'Last AC',
    'ranklist.noData': 'No ranking data yet.',
    'ranklist.na': 'N/A',
    'contests.title': 'Contest list',
    'contests.lead': 'Common OJ navigation usually includes contests, so this page provides the first structured version.',
    'contests.start': 'Start',
    'contests.end': 'End',
    'contests.name': 'Contest',
    'contests.status': 'Status',
    'contests.action': 'Action',
    'contests.open': 'Open contest page',
    'contests.empty': 'No contests yet.',
    'contest.status': 'Status',
    'contest.start': 'Start',
    'contest.end': 'End',
    'contest.aboutTitle': 'About this page',
    'contest.aboutBody': 'This is a first-stage contest page shell. It gives the OJ a standard contest navigation flow now, while real contest rules and scoreboard behavior can be added later without redesigning the page system.',
    'login.title': 'Account login',
    'login.lead': 'Sign in to submit code, review your history, and access the common OJ pages.',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.usernamePlaceholder': 'demo',
    'login.passwordPlaceholder': 'Enter your password',
    'login.submit': 'Sign in',
    'login.createAccount': 'Create account',
    'register.title': 'Student registration',
    'register.lead': 'Create a basic account for class use and wait for administrator approval when needed.',
    'register.username': 'Username',
    'register.name': 'Name',
    'register.gender': 'Gender',
    'register.grade': 'Grade',
    'register.className': 'Class',
    'register.password': 'Password',
    'register.usernamePlaceholder': 'student_01',
    'register.namePlaceholder': 'Your name',
    'register.genderPlaceholder': 'male / female / other',
    'register.gradePlaceholder': '2025',
    'register.classNamePlaceholder': 'Class 1',
    'register.passwordPlaceholder': 'At least 8 characters',
    'register.submit': 'Register',
    'register.backToLogin': 'Back to login',
    'profile.title': 'Profile',
    'profile.lead': 'Basic account information for the current user.',
    'profile.username': 'Username',
    'profile.role': 'Role',
    'profile.approval': 'Approval',
    'admin.users.title': 'Admin users',
    'admin.users.lead': 'Review current user accounts and their approval status.',
    'admin.users.noDisplayName': 'No display name',
    'admin.users.username': 'Username',
    'admin.users.name': 'Name',
    'admin.users.role': 'Role',
    'admin.users.approval': 'Approval',
    'admin.users.actions': 'Actions',
    'admin.users.select': 'Select',
    'admin.users.approve': 'Approve',
    'admin.users.reject': 'Reject',
    'admin.users.bulkApprove': 'Bulk approve',
    'admin.users.bulkReject': 'Bulk reject',
    'admin.users.empty': 'No users to review.',
    'admin.dashboard.title': 'Admin dashboard',
    'admin.dashboard.lead': 'Open all administrator tools from one place without memorizing backend URLs.',
    'admin.dashboard.problemsTitle': 'Problem management',
    'admin.dashboard.problemsBody': 'Create, edit, and publish problems with statements and language settings.',
    'admin.dashboard.openProblems': 'Open problems',
    'admin.dashboard.createProblem': 'Create problem',
    'admin.dashboard.usersTitle': 'User approval',
    'admin.dashboard.usersBody': 'Review registered users and approve or reject student accounts in batches.',
    'admin.dashboard.openUsers': 'Open users',
    'admin.dashboard.submissionsTitle': 'Submission management',
    'admin.dashboard.submissionsBody': 'Review all submissions and track judging status and final verdicts.',
    'admin.dashboard.openSubmissions': 'Open submissions',
    'admin.dashboard.languagesTitle': 'Language settings',
    'admin.dashboard.languagesBody': 'Control which programming languages are globally available for users to submit.',
    'admin.dashboard.openLanguages': 'Open language settings',
    'admin.problems.title': 'Admin problems',
    'admin.problems.lead': 'Browse problems in the same way an OJ manager would scan the catalog.',
    'admin.problems.create': 'Create problem',
    'admin.problems.pid': 'PID',
    'admin.problems.titleColumn': 'Title',
    'admin.problems.languages': 'Languages',
    'admin.problems.visibility': 'Visibility',
    'admin.problems.action': 'Action',
    'admin.problems.edit': 'Edit',
    'admin.problems.publish': 'Publish',
    'admin.problems.empty': 'No problems available.',
    'admin.submissions.title': 'Admin submissions',
    'admin.submissions.lead': 'Track judging activity across all submissions in a standard list view.',
    'admin.submissions.submissionId': 'Submission ID',
    'admin.submissions.user': 'User',
    'admin.submissions.problem': 'Problem',
    'admin.submissions.language': 'Language',
    'admin.submissions.status': 'Status',
    'admin.submissions.judge': 'Judge',
    'admin.submissions.verdict': 'Verdict',
    'admin.submissions.action': 'Action',
    'admin.submissions.empty': 'No submissions yet.',
    'admin.problemForm.createTitle': 'Create problem',
    'admin.problemForm.createLead': 'Add a new problem metadata record for the OJ.',
    'admin.problemForm.editTitle': 'Edit problem',
    'admin.problemForm.editLead': 'Update title, statement, languages, and visibility for an existing problem.',
    'admin.problemForm.pid': 'PID',
    'admin.problemForm.title': 'Title',
    'admin.problemForm.statement': 'Statement',
    'admin.problemForm.languages': 'Languages',
    'admin.problemForm.visible': 'Visible',
    'admin.problemForm.hidden': 'Hidden',
    'admin.problemForm.visibleOption': 'Visible',
    'admin.problemForm.save': 'Save problem',
    'admin.problemForm.back': 'Back',
    'admin.problemForm.publish': 'Publish problem',
    'admin.languages.title': 'Language settings',
    'admin.languages.lead': 'Control which programming languages are visible to users and allowed for submissions site-wide.',
    'admin.languages.enabled': 'Enabled languages',
    'admin.languages.save': 'Save settings',
    'admin.languages.back': 'Back to admin dashboard',
    'status.pending': 'pending',
    'status.approved': 'approved',
    'status.rejected': 'rejected',
    'status.visible': 'Visible',
    'status.hidden': 'Hidden',
    'contestStatus.Upcoming': 'Upcoming',
    'contestStatus.Open Practice': 'Open Practice',
    'contestStatus.Running': 'Running',
    'contestStatus.Finished': 'Finished',
    'submissionStatus.PENDING_DISPATCH': 'Pending dispatch',
    'submissionStatus.SENT_TO_JUDGE': 'Sent to judge',
    'submissionStatus.JUDGING': 'Judging',
    'submissionStatus.FINISHED': 'Finished',
    'submissionStatus.FAILED': 'Failed',
    'judgeStatus.QUEUED': 'Queued',
    'judgeStatus.PREPARING': 'Preparing',
    'judgeStatus.COMPILING': 'Compiling',
    'judgeStatus.RUNNING': 'Running',
    'judgeStatus.FINISHED': 'Finished',
    'judgeStatus.FAILED': 'Failed',
    'verdict.PENDING': 'PENDING',
    'verdict.AC': 'AC',
    'verdict.WA': 'WA',
    'verdict.TLE': 'TLE',
    'verdict.MLE': 'MLE',
    'verdict.RE': 'RE',
    'verdict.OLE': 'OLE',
    'verdict.PE': 'PE',
    'verdict.CE': 'CE',
    'verdict.UNKNOWN': 'UNKNOWN',
    'verdict.SYSTEM_ERROR': 'SYSTEM_ERROR',
    'role.student': 'student',
    'role.admin': 'admin',
  },
};

export interface ViewContextHelpers {
  lang: UiLang;
  t: (key: TranslationKey) => string;
  urlWithLang: (path: string) => string;
  currentUrlForLang: (targetLang: UiLang) => string;
  localizeStatus: (status: string | null | undefined) => string;
  localizeJudgeStatus: (status: string | null | undefined) => string;
  localizeVerdict: (verdict: string | null | undefined) => string;
  localizeContestStatus: (status: string | null | undefined) => string;
  localizeApprovalStatus: (status: string | null | undefined) => string;
  localizeRole: (role: string | null | undefined) => string;
}

function hasTranslationKey(
  lang: UiLang,
  key: string,
): key is TranslationKey {
  return key in translations[lang];
}

// 往任意路径里补上 lang 参数，同时保留 query 和 hash。
function withLang(path: string, lang: UiLang) {
  const [pathnameWithQuery, hash = ''] = path.split('#', 2);
  const [pathname, search = ''] = pathnameWithQuery.split('?', 2);
  const params = new URLSearchParams(search);
  params.set('lang', lang);
  const query = params.toString();
  const url = query ? `${pathname}?${query}` : pathname;
  return hash ? `${url}#${hash}` : url;
}

export function resolveUiLang(input: unknown): UiLang {
  return input === 'en' ? 'en' : 'zh';
}

export function createViewContext(
  lang: UiLang,
  currentPath: string,
): ViewContextHelpers {
  // 这里返回的是模板运行时的 helper 集合。
  // Pug 里不应该自己拼状态文案和语言链接，而是统一走这些 helper。
  return {
    lang,
    t(key) {
      return translations[lang][key];
    },
    urlWithLang(path) {
      return withLang(path, lang);
    },
    currentUrlForLang(targetLang) {
      return withLang(currentPath, targetLang);
    },
    localizeStatus(status) {
      if (!status) {
        return '';
      }
      const key = `submissionStatus.${status}`;
      return hasTranslationKey(lang, key) ? translations[lang][key] : status;
    },
    localizeJudgeStatus(status) {
      if (!status) {
        return '';
      }
      const key = `judgeStatus.${status}`;
      return hasTranslationKey(lang, key) ? translations[lang][key] : status;
    },
    localizeVerdict(verdict) {
      if (!verdict) {
        return '';
      }
      const key = `verdict.${verdict}`;
      return hasTranslationKey(lang, key) ? translations[lang][key] : verdict;
    },
    localizeContestStatus(status) {
      if (!status) {
        return '';
      }
      const key = `contestStatus.${status}`;
      return hasTranslationKey(lang, key) ? translations[lang][key] : status;
    },
    localizeApprovalStatus(status) {
      if (!status) {
        return '';
      }
      const key = `status.${status}`;
      return hasTranslationKey(lang, key) ? translations[lang][key] : status;
    },
    localizeRole(role) {
      if (!role) {
        return '';
      }
      const key = `role.${role}`;
      return hasTranslationKey(lang, key) ? translations[lang][key] : role;
    },
  };
}
