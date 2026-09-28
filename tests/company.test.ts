/**
 * A1 验收测试：企业事实层（PRD §2 / §7.7）
 *
 * 这些测试的价值不在于"跑通"，而在于**锁死文案纪律**：
 * 任何人将来往 lib/company.ts 里塞无出处的字段（业绩、评价、人数、资质），
 * 或手滑改动工商数据，都会在这里被拦下。
 */
import { describe, expect, it } from "vitest";
import {
  BUSINESS_SCOPE,
  COMPANY,
  COMPANY_INTRO,
  MAIL_HREF,
  REGISTRATION_FIELDS,
  TEL_HREF,
} from "@/lib/company";

describe("工商事实与 txt 出处一致", () => {
  it("公司名称、信用代码、法定代表人正确", () => {
    expect(COMPANY.name).toBe("重庆锐强建筑劳务有限公司");
    expect(COMPANY.unifiedSocialCreditCode).toBe("91500111MACM8P5450");
    expect(COMPANY.legalRepresentative).toBe("唐利平");
  });

  it("注册资本采用变更后的现行值 50 万元（而非执照照片上的 300 万元）", () => {
    expect(COMPANY.registeredCapitalWan).toBe(50);
  });

  it("成立日期、企业类型、经营状态、登记机关正确", () => {
    expect(COMPANY.foundedOn).toBe("2023-06-30");
    expect(COMPANY.companyType).toBe("有限责任公司(自然人独资)");
    expect(COMPANY.status).toBe("开业");
    expect(COMPANY.registryAuthority).toBe("重庆市大足区市场监督管理局");
  });

  it("注册地址逐字一致", () => {
    expect(COMPANY.address).toBe(
      "重庆市大足区棠香街道二环北路中段187号附50号"
    );
  });

  it("工商注册号 / 组织机构代码 / 纳税人识别号正确", () => {
    expect(COMPANY.registrationNumber).toBe("500225017019686");
    expect(COMPANY.organizationCode).toBe("MACM8P54-5");
    expect(COMPANY.taxpayerId).toBe("91500111MACM8P5450");
  });

  it("营业期限与所属行业正确", () => {
    expect(COMPANY.businessTerm).toBe("2023-06-30 至 无固定期限");
    expect(COMPANY.industry).toBe("建筑装饰、装修和其他建筑业");
  });
});

describe("联系方式（PRD §7.4）", () => {
  it("电话与邮箱取自 txt", () => {
    expect(COMPANY.phone).toBe("19936641843");
    expect(COMPANY.email).toBe("1053210854@qq.com");
  });

  it("tel: 链接格式严格正确", () => {
    expect(TEL_HREF).toBe("tel:19936641843");
  });

  it("mailto: 链接格式严格正确", () => {
    expect(MAIL_HREF).toBe("mailto:1053210854@qq.com");
  });
});

describe("经营范围原文（PRD §2.1）", () => {
  it("许可项目包含全部 6 项，且以法定尾注收尾", () => {
    const s = BUSINESS_SCOPE.licensed;
    for (const item of [
      "建筑劳务分包",
      "建设工程施工",
      "施工专业作业",
      "建设工程设计",
      "住宅室内装饰装修",
      "建设工程监理",
    ]) {
      expect(s).toContain(item);
    }
    expect(s).toContain("以相关部门批准文件或许可证件为准");
  });

  it("一般项目包含全部 7 项", () => {
    const s = BUSINESS_SCOPE.general;
    for (const item of [
      "工程管理服务",
      "装卸搬运",
      "建筑用石加工",
      "园林绿化工程施工",
      "建筑材料销售",
      "机械设备租赁",
      "建筑工程机械与设备租赁",
    ]) {
      expect(s).toContain(item);
    }
  });
});

describe("工商登记信息表覆盖 PRD §2 全部字段", () => {
  /*
   * PRD §2 表格共 17 个字段（实测逐行清点，见 PRD.md §2）。
   * 其中 联系电话 / 电子邮箱属于"联系方式"职责，在 /contact 与页脚已完整呈现，
   * 故 /about 的工商登记信息表只渲染 15 个工商字段，避免同一信息在页内重复两遍。
   * 下面两条断言把"15"这个数字与"§2 一个不漏"同时钉死。
   */
  it("PRD §2 事实源共 17 个字段（含联系方式）", () => {
    expect(Object.keys(COMPANY)).toHaveLength(17);
  });

  it("工商登记信息表渲染 15 个工商字段（17 减去电话/邮箱）", () => {
    expect(REGISTRATION_FIELDS).toHaveLength(15);
  });

  it("字段值与 COMPANY 逐项对应，无漏项", () => {
    const map = Object.fromEntries(
      REGISTRATION_FIELDS.map((f) => [f.label, f.value])
    );
    expect(map["公司名称"]).toBe(COMPANY.name);
    expect(map["统一社会信用代码"]).toBe(COMPANY.unifiedSocialCreditCode);
    expect(map["法定代表人"]).toBe(COMPANY.legalRepresentative);
    expect(map["注册资本"]).toBe("50 万元");
    expect(map["成立日期"]).toBe(COMPANY.foundedOn);
    expect(map["企业类型"]).toBe(COMPANY.companyType);
    expect(map["注册地址"]).toBe(COMPANY.address);
    expect(map["登记机关"]).toBe(COMPANY.registryAuthority);
    expect(map["经营状态"]).toBe(COMPANY.status);
    expect(map["营业期限"]).toBe(COMPANY.businessTerm);
    expect(map["所属行业"]).toBe(COMPANY.industry);
    expect(map["工商注册号"]).toBe(COMPANY.registrationNumber);
    expect(map["组织机构代码"]).toBe(COMPANY.organizationCode);
    expect(map["纳税人识别号"]).toBe(COMPANY.taxpayerId);
  });

  it("字段标签不重复", () => {
    const labels = REGISTRATION_FIELDS.map((f) => f.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("文案纪律：严禁无出处的事实（PRD §2 / §7.7）", () => {
  const FORBIDDEN_PATTERNS: ReadonlyArray<[string, RegExp]> = [
    ["编造的项目名（承接/承建某某工程）", /(承接|承建|完成了?)\s*[\u4e00-\u9fa5A-Za-z0-9]{2,20}(项目|工程|楼盘|厂房)/],
    ["业绩数字", /\d+\s*(个|项|余项)\s*(项目|工程)/],
    ["客户评价", /(客户评价|业主评价|好评|口碑|深受.{0,6}好评)/],
    ["人员数量", /(现有|拥有|员工|技术工人|团队)\s*\d+\s*(余)?\s*(人|名)/],
    ["设备数量", /(机械设备|设备)\s*\d+\s*(余)?\s*(台|套)/],
    ["资质等级", /(一级|二级|三级|甲级|乙级|特级)\s*资质/],
    ["荣誉奖项", /(荣获|获得|被评为).{0,10}(奖|荣誉|称号)/],
    ["虚假年限", /\d+\s*年\s*(行业)?(经验|历程|深耕)/],
    ["规模形容词", /(上千|数百|几十)\s*(平米|平方米|人|台)/],
  ];

  const corpus = [
    COMPANY.name,
    ...COMPANY_INTRO,
    BUSINESS_SCOPE.licensed,
    BUSINESS_SCOPE.general,
  ].join("\n");

  it.each(FORBIDDEN_PATTERNS)("不出现：%s", (_label, pattern) => {
    expect(corpus).not.toMatch(pattern);
  });

  it("简介与 txt 第 13 行的事实逐项对应（成立日、地址、法人）", () => {
    const intro = COMPANY_INTRO.join("");
    expect(intro).toContain("2023 年 6 月 30 日");
    expect(intro).toContain(COMPANY.address);
    expect(intro).toContain(COMPANY.legalRepresentative);
    expect(intro).toContain(COMPANY.registryAuthority);
  });

  it("事实源文件不包含任何项目 / 员工 / 客户 / 资质字段（类型层面堵住编造后路）", () => {
    const keys = Object.keys(COMPANY);
    for (const banned of [
      "projects",
      "cases",
      "clients",
      "employees",
      "staff",
      "certificates",
      "qualifications",
      "awards",
      "reviews",
      "equipment",
    ]) {
      expect(keys).not.toContain(banned);
    }
  });
});
