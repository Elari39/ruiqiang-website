/**
 * 重庆锐强建筑劳务有限公司 —— 全站唯一企业事实源
 *
 * 纪律（PRD §2 / §7.7）：
 *   本文件所有字段**必须**可回溯到 `重庆锐强建筑劳务有限公司.txt` 或营业执照照片。
 *   严禁在本文件新增任何无出处的字段（项目名称、业绩数字、客户评价、人员数量、
 *   设备数量、资质等级、荣誉奖项等）。后续维护者若需要这些内容，请先向用户取得
 *   材料，再连同出处注释一起加入，不得凭常识补全。
 *
 * 出处代号：
 *   [txt]  = `重庆锐强建筑劳务有限公司.txt`
 *   [lic]  = `img/c9231b84a2a8285c28081548ec3cfb41.jpg`（营业执照原件照，仅内部核对，不对外发布）
 */

/** 营业范围原文（PRD §2.1）—— 供 `/services` 页折叠区逐字展示 */
export const BUSINESS_SCOPE = {
  licensed:
    "建筑劳务分包；建设工程施工；施工专业作业；建设工程设计；住宅室内装饰装修；建设工程监理。（依法须经批准的项目，经相关部门批准后方可开展经营活动，具体经营项目以相关部门批准文件或许可证件为准）",
  general:
    "工程管理服务；装卸搬运；建筑用石加工；园林绿化工程施工；建筑材料销售；机械设备租赁；建筑工程机械与设备租赁。（除依法须经批准的项目外，凭营业执照依法自主开展经营活动）",
} as const;

export const COMPANY = {
  /** [txt:1] [lic] */
  name: "重庆锐强建筑劳务有限公司",

  /** [txt:2] [lic] */
  unifiedSocialCreditCode: "91500111MACM8P5450",

  /** [txt:6] [lic] */
  legalRepresentative: "唐利平",

  /**
   * [txt:9] 注册资本 50 万元。
   *
   * ⚠️ 存在两个数字（见 PRD §10 假设 1）：
   *   - 营业执照照片载明 300 万元（成立时值）　[lic]
   *   - txt 第 23 行载明 2025-12-28 由 300 万元减至 50 万元　[txt:23]
   * 本项目采用**变更后的现行值 50 万元**。若需改为 300 万元，改此处即可。
   */
  registeredCapitalWan: 50,

  /** [txt:11] [lic] */
  foundedOn: "2023-06-30",

  /** [txt:16] [lic] */
  companyType: "有限责任公司(自然人独资)",

  /** [txt:10] [lic] */
  address: "重庆市大足区棠香街道二环北路中段187号附50号",

  /** [txt:22] */
  registryAuthority: "重庆市大足区市场监督管理局",

  /** [txt:14] 经营状态 */
  status: "开业",

  /** [txt:21] */
  businessTerm: "2023-06-30 至 无固定期限",

  /** [txt:17] */
  industry: "建筑装饰、装修和其他建筑业",

  /** [txt:18] */
  registrationNumber: "500225017019686",

  /** [txt:19] */
  organizationCode: "MACM8P54-5",

  /** [txt:20] */
  taxpayerId: "91500111MACM8P5450",

  /** [txt:15] */
  administrativeDivision: "重庆市大足区",

  /** [txt:4] */
  phone: "19936641843",

  /** [txt:8] */
  email: "1053210854@qq.com",
} as const;

/** 电话号码的可拨号链接（PRD §7.4） */
export const TEL_HREF = `tel:${COMPANY.phone}`;

/** 邮箱链接（PRD §7.4） */
export const MAIL_HREF = `mailto:${COMPANY.email}`;

/**
 * 公司简介 —— 改写自 [txt:13] 简介段落，仅调整为官网口吻，未新增任何事实。
 * 与 [txt:13] 的差异只在于语序与称呼，事实逐项对应。
 */
export const COMPANY_INTRO = [
  `${COMPANY.name}成立于 2023 年 6 月 30 日，注册地位于${COMPANY.address}，法定代表人为${COMPANY.legalRepresentative}。`,
  `公司经营范围涵盖许可项目与一般项目两类：许可项目包括建筑劳务分包、建设工程施工、施工专业作业、建设工程设计、住宅室内装饰装修、建设工程监理；一般项目包括工程管理服务、装卸搬运、建筑用石加工、园林绿化工程施工、建筑材料销售、机械设备租赁、建筑工程机械与设备租赁。`,
  `公司登记机关为${COMPANY.registryAuthority}，企业类型为${COMPANY.companyType}，当前经营状态为${COMPANY.status}。`,
] as const;

/**
 * 工商登记信息表字段顺序（PRD §4.4 要求展示 §2 全部字段）。
 * 页面按此数组渲染，避免人工罗列时漏项。
 */
export const REGISTRATION_FIELDS: ReadonlyArray<{
  label: string;
  value: string;
}> = [
  { label: "公司名称", value: COMPANY.name },
  { label: "统一社会信用代码", value: COMPANY.unifiedSocialCreditCode },
  { label: "法定代表人", value: COMPANY.legalRepresentative },
  { label: "注册资本", value: `${COMPANY.registeredCapitalWan} 万元` },
  { label: "成立日期", value: COMPANY.foundedOn },
  { label: "企业类型", value: COMPANY.companyType },
  { label: "注册地址", value: COMPANY.address },
  { label: "登记机关", value: COMPANY.registryAuthority },
  { label: "经营状态", value: COMPANY.status },
  { label: "营业期限", value: COMPANY.businessTerm },
  { label: "所属行业", value: COMPANY.industry },
  { label: "工商注册号", value: COMPANY.registrationNumber },
  { label: "组织机构代码", value: COMPANY.organizationCode },
  { label: "纳税人识别号", value: COMPANY.taxpayerId },
  { label: "行政区划", value: COMPANY.administrativeDivision },
];
