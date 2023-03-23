import {
RegistryItem,
RegistryEntity,
RegistryResponse,
RegulatorPassportsEntity,
RegulatorTOsItem,
} from "../dto";
import { CountResponse, SubdivisionEntity } from "@/dto";
import {
composeGetOptions,
composeDeleteOptions,
composePutOptions,
extractErrorMessage,
} from "@/utils";
import { TypedJSON } from "typedjson";
import { config } from "@/config";
import { Common } from "../common";
import FiltersData from "../desktop/filters/FiltersData";
import RegulatorEntity from "../../../../dto/integration/RegulatorEntity";
import RegulatorTOsResponse from "../dto/RegulatorTOsResponse";
export default class ApiController {
private static readonly SE =
"Ошибка при обращении к серверу RegulatorsRegistry";
private static readonly GE =
"Ошибка при обращении к серверу";
private readonly API_BASE_URL = config.desktops.regulatorsRegistry.apiBase
private composeFilters(filters: FiltersData): string {
const filtersPart = [];
if (filters.Zone)
  filtersPart.push(
     `(contains(Zone, '${filters.Zone}') or contains(SubZone, '${filters.Zone}'))`
  );
if (filtersPart.length > 0) {
  return `&$filter=${filtersPart.join(" and ")}`;
}
return "";
}
private composeTOsFilters(filters: FiltersData): string {
return ` and IsDeleted eq ${filters.ShowDeleted}`;
}
public composeOrderBy(
sortField: string | undefined,
sortOrder: string | undefined
): string {
if (!sortField) {
  return "";
}
return `$orderby=${sortField} ${sortOrder ?? "asc"}&`;
}
public async getRegistry(
skip: number,
take: number,
filters: FiltersData,
sortField: string | undefined,
sortOrder: string | undefined
): Promise<Array<RegistryItem>> {
const filtersPart = await this.composeFilters(filters);
const serializer = new TypedJSON(RegistryResponse);
const orderBy = this.composeOrderBy(sortField, sortOrder);
const response = await fetch(
  `${this.API_BASE_URL}/RegulatorPassportsRegistryDatas/?${orderBy}$count=false&$skip=${skip}&$top=${take}${filtersPart}`,
  composeGetOptions()
);
if (!response.ok) {
  console.error(
    `${ApiController.SE} (код ${response.status}, ${response.statusText})`
  );
  throw new Error(ApiController.GE);
}
const json = await response.text();
return serializer.parse(json)?.value.map((x) => new RegistryItem(x)) ?? [];
}
 
public async getRegistryForExport(
skip: number,
take: number,
filters: FiltersData,
sortField: string | undefined,
sortOrder: string | undefined
): Promise<Array<Record<string, string>>> {
const entities = await this.getRegistry(
  skip,
  take,
  filters,
  sortField,
  sortOrder
);
const common = new Common();
return entities.map((x) => common.formatForExport(x));
}
public async getTotalCount(filters: FiltersData): Promise<number> {
const serializer = new TypedJSON(CountResponse);
const filtersPart = await this.composeFilters(filters);
const response = await fetch(
  `${this.API_BASE_URL}/RegulatorPassportsRegistryDatas/?$count=true&$top=0${filtersPart}`,
  composeGetOptions()
);
if (!response.ok) {
  console.error(
    `${ApiController.SE} (код ${response.status}, ${response.statusText})`
  );
  throw new Error(ApiController.GE);
}
const json = await response.text();
return serializer.parse(json)?.count ?? 0;
}
public async getMeasuresTotalCount(
id: string,
filters: FiltersData
): Promise<number> {
const serializer = new TypedJSON(CountResponse);
const filtersPart = await this.composeTOsFilters(filters);
const response = await fetch(
  `${this.API_BASE_URL}/RegulatorTOs?$filter=RegulatorPassportGuid eq ${id}${filtersPart}&$expand=RegulatorTOMeasures&$count=true&$top=0`,
  composeGetOptions()
);
if (!response.ok) {
  console.error(
    `${ApiController.SE} (код ${response.status}, ${response.statusText})`
  );
  throw new Error(ApiController.GE);
}
const json = await response.text();
return serializer.parse(json)?.count ?? 0;
}
public async remove(id: string, comment: string): Promise<void> {
const response = await fetch(
  `${this.API_BASE_URL}/RegulatorPassportsRegistryDatas(${id})`,
  composeDeleteOptions({ Comment: comment })
);
if (!response.ok) {
  console.error(
    `Ошибка при удалении объекта Regulators ${id} (код ${response.status}, ${response.statusText})`
  );
  throw new Error(`Ошибка при удалении объекта`);
}
}
public async getById(id: string): Promise<RegulatorEntity> {
const serializer = new TypedJSON(RegulatorEntity);
const response = await fetch(
  `${this.API_BASE_URL}/RegulatorPassportsRegistryDatas?$filter=Guid eq ${id}&$top=0`,
  composeGetOptions()
);
if (!response.ok) {
  console.error(
    `${ApiController.SE} (код ${response.status}, ${response.statusText})`
  );
  throw new Error(ApiController.GE);
}
const json = await response.text();
const entity = serializer.parse(json);
if (!entity)
  throw new Error(`Объект с ключом ${id} не найден в Regulators.`);
return entity;
}
public async getRegistryEntityById(id: string): Promise<RegistryEntity> {
const serializer = new TypedJSON(RegistryResponse);
const response = await fetch(
  `${this.API_BASE_URL}/RegulatorPassportsRegistryDatas?$filter=Guid eq ${id}`,
  composeGetOptions()
);
if (!response.ok) {
  console.error(
    `${ApiController.SE} (код ${response.status}, ${response.statusText})`
  );
  throw new Error(ApiController.GE);
}
const json = await response.text();
const data = serializer.parse(json);
const entity = data?.value.find(
  (x) => x.Guid.toLowerCase() === id.toLowerCase()
);
if (!entity)
  throw new Error(
    `Объект с ключом ${id} не найден в RegulatorPassportsRegistryDatas.`
  );
return entity;
}
public async getRegulatorPassportEntityById(
id: string
): Promise<RegulatorPassportsEntity | undefined> {
const serializer = new TypedJSON(RegulatorPassportsEntity);
const response = await fetch(
  `${this.API_BASE_URL}/RegulatorPassports(${id})?$expand=ObjectChangeAuthorUser`,
  composeGetOptions()
);
if (!response.ok) {
  console.error(
    `${ApiController.SE} (код ${response.status}, ${response.statusText})`
  );
  throw new Error(ApiController.GE);
}
const json = await response.text();
const data = serializer.parse(json);
return data;
}
public async getRegulatorTOsRegistry(
id: string,
skip: number,
take: number,
filters: FiltersData
): Promise<Array<RegulatorTOsItem>> {
const serializer = new TypedJSON(RegulatorTOsResponse);
const filtersPart = await this.composeTOsFilters(filters);
const response = await fetch(
  `${this.API_BASE_URL}/RegulatorTOs?$filter=RegulatorPassportGuid eq ${id}${filtersPart}&$skip=${skip}&$top=${take}&$expand=RegulatorTOMeasures($expand=ObjectChangeAuthorUser,ObjectCreateAuthorUser),ObjectChangeAuthorUser,ObjectCreateAuthorUser`,
  composeGetOptions()
);
if (!response.ok) {
  console.error(
    `${ApiController.SE} (код ${response.status}, ${response.statusText})`
  );
  throw new Error(ApiController.GE);
}
const json = await response.text();
const measures: RegulatorTOsItem[] = [];
serializer.parse(json)?.value.forEach((item) => {
  measures.push(new RegulatorTOsItem(item));
});
return measures;
}  
public async saveEdit(entity: RegulatorPassportsEntity): Promise<void> {
const response = await fetch(
  `${this.API_BASE_URL}/RegulatorPassports(${entity.Guid})`,
  composePutOptions(entity)
);
if (!response.ok) {
  console.log(response);
  console.error(
    `Ошибка при изменении объекта RegulatorPassports (код ${response.status}, ${response.statusText})`
  );
  throw new Error(
    await extractErrorMessage(response, `Ошибка при изменении объекта`)
  );
}
}
public async getSubdivisions(): Promise<SubdivisionEntity[] | undefined> {
const response = await fetch(`${config.services.integration}/orgstruct/Subdivisions?$filter=(SubdivisionType eq 155998BB-3D7C-447E-8375-54DB2F6006FF) and (ProfileType eq 1 or ProfileType eq 3 or ProfileType eq 5) and IsDeleted eq false&$orderby=Name`);
if(response.status === 404) return undefined;
if(response.ok){
    const subdivisions = JSON.parse(await response.text()).value as SubdivisionEntity[];
    return subdivisions;
} else throw new Error(` произошла ошибка ${response.statusText}`);
}
}
