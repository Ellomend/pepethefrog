// src/components/desktops/RegulatorsRegistry/desktop/store.ts

import {
  DefaultSettings,
  DesktopStore,
  DesktopStoreData,
} from "@/store/DesktopStore";
import SortingData from "@/components/DesktopDataGrid/SortingData";
import RegistryItem from "../dto/RegistryItem";
import FiltersData from "./filters/FiltersData";
/* eslint-disable-next-line @typescript-eslint/no-empty-interface */
interface RegulatorsRegistryData
  extends DesktopStoreData<RegistryItem, FiltersData> {}

export class RegulatorsRegistryDesktopStore extends DesktopStore<
  RegistryItem,
  FiltersData,
  DefaultSettings<FiltersData>,
  RegulatorsRegistryData
> {
  protected data(): RegulatorsRegistryData {
    return {
      registry: [],
      totalCount: 0,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      filters: new FiltersData(),
      filterText: "",
      sorting: new SortingData(),
    };
  }

  protected setup(): void {
    // nop
  }

  /// Устанавливает сортировку реестра
  public setSorting(sorting: SortingData): void {
    this.state.sorting = sorting;
  }

  // Получает текст применённых фильтров для отображения пользователю
  protected getFiltersDisplayText(): string {
    const items = new Array<string>();

    if (this.state.filters.Zone) {
      items.push(`Зона: содержит '${this.state.filters.Zone}'`);
    }

    if (this.state.filters.ShowDeleted) items.push(`Удалённые: да`);

    return items.join(", ");
  }
}

export const desktopStore: RegulatorsRegistryDesktopStore = new RegulatorsRegistryDesktopStore(
  "regulatorsRegistry"
);