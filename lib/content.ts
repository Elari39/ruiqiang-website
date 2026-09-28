/**
 * 站点内容：图片清单、业务分组、首页四大能力卡。
 *
 * 纪律（PRD §2 / §7.7）：
 *   - 图片说明只描述**施工内容**，不得写成"某某项目"（PRD §2.2 尾注：
 *     材料中没有项目名称/地点/甲方，标成项目即构成虚假业绩）。
 *   - 业务分组严格照 PRD §4.2 的三组划分，不自行增删条目。
 */

/** 相册图片。key 与 scripts/build-images.mjs 的产出文件名前缀一一对应。 */
export const GALLERY = [
  {
    key: "rebar-slab",
    caption: "底板钢筋绑扎完成面",
    alt: "施工现场底板钢筋绑扎完成面，周边设蓝色防护网",
    ratio: "16/9",
  },
  {
    key: "rebar-crew",
    caption: "施工人员在钢筋网上作业",
    alt: "多名施工人员在钢筋网上作业，均佩戴安全帽",
    ratio: "16/9",
  },
  {
    key: "steel-frame-slab",
    caption: "钢结构厂房内楼板钢筋绑扎",
    alt: "钢结构厂房内楼板钢筋绑扎作业面，远处可见起重设备",
    ratio: "16/9",
  },
  {
    key: "steel-frame-wide",
    caption: "钢结构厂房内的大面积钢筋网施工",
    alt: "大型钢结构厂房内的大面积钢筋网施工",
    ratio: "16/9",
  },
] as const;

/** 首页首屏视觉锚点：办公场所门头（PRD §4.1） */
export const HERO_IMAGE = {
  key: "storefront",
  alt: "重庆锐强建筑劳务有限公司办公场所门头，玻璃门与金属招牌",
} as const;

/** 首页"业务能力"四张卡（PRD §4.1：劳务分包 / 工程施工 / 装饰装修 / 配套服务） */
export const CAPABILITIES = [
  {
    title: "建筑劳务分包",
    body: "承接建筑劳务分包作业，按施工现场需要组织劳动力投入。",
    tone: "yellow",
  },
  {
    title: "建设工程施工",
    body: "承接建设工程施工与施工专业作业，包含钢筋、模板、混凝土等分项工序。",
    tone: "blue",
  },
  {
    title: "设计与装修",
    body: "承接建设工程设计、住宅室内装饰装修与建设工程监理业务。",
    tone: "pink",
  },
  {
    title: "工程配套服务",
    body: "工程管理服务、装卸搬运、建筑用石加工、园林绿化工程施工、建筑材料销售与机械设备租赁。",
    tone: "green",
  },
] as const;

/**
 * 服务项目三组（PRD §4.2）。
 * 条目文字取自经营范围（PRD §2.1）中的对应项，未新增任何服务。
 */
export const SERVICE_GROUPS = [
  {
    title: "建筑劳务分包与施工",
    items: ["建筑劳务分包", "建设工程施工", "施工专业作业"],
  },
  {
    title: "设计与装修",
    items: ["建设工程设计", "住宅室内装饰装修", "建设工程监理"],
  },
  {
    title: "配套服务",
    items: [
      "工程管理服务",
      "装卸搬运",
      "建筑用石加工",
      "园林绿化工程施工",
      "建筑材料销售",
      "机械设备租赁",
      "建筑工程机械与设备租赁",
    ],
  },
] as const;

export type GalleryItem = (typeof GALLERY)[number];
