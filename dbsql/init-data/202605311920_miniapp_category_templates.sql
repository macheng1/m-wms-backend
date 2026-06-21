-- 小程序制造业分类发布模板初始化
-- 影响范围：miniapp_categories.templateFields

UPDATE `miniapp_categories`
SET `templateFields` = JSON_ARRAY(
  JSON_OBJECT('field', 'processType', 'label', '加工类型', 'type', 'select', 'required', true, 'options', JSON_ARRAY('CNC加工', '钣金加工', '注塑', '模具', '焊接', '表面处理', '组装', '包装', '设备维修')),
  JSON_OBJECT('field', 'material', 'label', '材质', 'type', 'text', 'required', false),
  JSON_OBJECT('field', 'quantity', 'label', '数量', 'type', 'number', 'required', false),
  JSON_OBJECT('field', 'deliveryDate', 'label', '交期', 'type', 'date', 'required', false),
  JSON_OBJECT('field', 'region', 'label', '地区', 'type', 'text', 'required', true),
  JSON_OBJECT('field', 'budget', 'label', '预算', 'type', 'text', 'required', false)
)
WHERE `code` IN ('factory_processing', 'outsourcing_order');

UPDATE `miniapp_categories`
SET `templateFields` = JSON_ARRAY(
  JSON_OBJECT('field', 'equipmentType', 'label', '设备类型', 'type', 'text', 'required', true),
  JSON_OBJECT('field', 'processRange', 'label', '可加工范围', 'type', 'textarea', 'required', false),
  JSON_OBJECT('field', 'moq', 'label', '最小起订量', 'type', 'text', 'required', false),
  JSON_OBJECT('field', 'urgent', 'label', '可接急单', 'type', 'select', 'required', false, 'options', JSON_ARRAY('可接', '不可接')),
  JSON_OBJECT('field', 'region', 'label', '地区', 'type', 'text', 'required', true)
)
WHERE `code` = 'capacity';

UPDATE `miniapp_categories`
SET `templateFields` = JSON_ARRAY(
  JSON_OBJECT('field', 'partType', 'label', '供应类型', 'type', 'select', 'required', true, 'options', JSON_ARRAY('原材料', '标准件', '五金件', '电子元件', '包材', '辅料')),
  JSON_OBJECT('field', 'spec', 'label', '规格型号', 'type', 'text', 'required', false),
  JSON_OBJECT('field', 'stock', 'label', '库存数量', 'type', 'text', 'required', false),
  JSON_OBJECT('field', 'region', 'label', '地区', 'type', 'text', 'required', true)
)
WHERE `code` = 'materials_parts';

UPDATE `miniapp_categories`
SET `templateFields` = JSON_ARRAY(
  JSON_OBJECT('field', 'equipmentType', 'label', '设备类型', 'type', 'select', 'required', true, 'options', JSON_ARRAY('二手机床', '生产设备', '检测设备', '叉车/仓储设备', '设备租赁')),
  JSON_OBJECT('field', 'tradeType', 'label', '交易方式', 'type', 'select', 'required', true, 'options', JSON_ARRAY('出售', '求购', '出租', '求租')),
  JSON_OBJECT('field', 'brandModel', 'label', '品牌型号', 'type', 'text', 'required', false),
  JSON_OBJECT('field', 'region', 'label', '地区', 'type', 'text', 'required', true)
)
WHERE `code` = 'equipment_trade_rent';

UPDATE `miniapp_categories`
SET `templateFields` = JSON_ARRAY(
  JSON_OBJECT('field', 'jobType', 'label', '工种', 'type', 'select', 'required', true, 'options', JSON_ARRAY('普工', '焊工', 'CNC操机', '质检', '维修工', '临时工', '班组承包')),
  JSON_OBJECT('field', 'headcount', 'label', '人数', 'type', 'number', 'required', false),
  JSON_OBJECT('field', 'wage', 'label', '薪资/报价', 'type', 'text', 'required', false),
  JSON_OBJECT('field', 'region', 'label', '地区', 'type', 'text', 'required', true)
)
WHERE `code` = 'jobs_work';
