/* eslint-disable no-console */
import {
  defineComponent,
  nextTick,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import Filters from "./filters/Filters.vue";
import DataGrid from "@/components/DesktopDataGrid/component.vue";
import { SkipTake } from "@/components/DesktopDataGrid";
import { Desktops, NewItemId } from "@/constants";
import Popover from "devextreme-vue/popover";
import Popup from "devextreme-vue/popup";
import TabPanel, { DxItem as TabItem } from "devextreme-vue/tab-panel";
import Toolbar, { DxItem as ToolItem } from "devextreme-vue/toolbar";
import DButton from "devextreme-vue/button";
import DTextArea from "devextreme-vue/text-area";
import {
  formatDateWithTime,
  isNullOrEmpty,
  navigateToDetails,
  navigateToNoAccess,
  processRegistryDataRequestGeneric,
} from "@/utils";
import { toastError } from "@/utilsDesktop";
import ApiController from "../api/ApiController";
import { RegistryItem } from "../dto";
import Columns from "./ColumnsDescription";
import { desktopStore, RegulatorsRegistryDesktopStore } from "./store";
import { authStore } from "@/store/auth-store";
import { appStore } from "@/store/app-store";
import FiltersData from "./filters/FiltersData";
import { DefaultSettings } from "@/store/DesktopStore";
import RegulatorsRegistryDesktopDetailsCard from '@/components/desktops/RegulatorsRegistry/desktop/card/regulator/RegulatorDetails.vue';
export default defineComponent({
  name: "RegulatorsRegistryDesktopComponent",
  components: {
    Popover,
    Popup,
    Toolbar,
    ToolItem,
    DButton,
    TabPanel,
    TabItem,
    DTextArea,
    Filters,
    DataGrid,
    RegulatorsRegistryDesktopDetailsCard
  },
  setup() {
    const cardPopupAttrs = {
      class: 'regulators-card-popup'
    }
    const editor = ref();
    const gridWrapper = ref();
    const gridOffsetTop = ref(0);
    const loadErrorMessageData = reactive<{ isShown: boolean, title: string, message: string }>({
      isShown: false,
      title: "",
      message: ""
    });
    const confirmData = reactive<{
      comment: string;
      shown: boolean;
      isValid: boolean;
      id: string;
      zone: string;
      validate: () => void;
    }>({
      comment: "",
      shown: false,
      isValid: false,
      id: "",
      zone: "",
      validate: () => {
        confirmData.isValid =
          !isNullOrEmpty(confirmData.comment) &&
          confirmData.comment?.length > 3;
      },
    });
    const editCard = reactive<{
      isShown: boolean;
      title: string;
      id: string;
    }>({
      isShown: false,
      title: "",
      id: "",
    });
    const columns = reactive<{ value: Array<unknown> }>({ value: [] });
    const composeFiltersHeader = (filter: string): string => {
      if (isNullOrEmpty(filter)) return "";
      else return `: ${filter}`;
    };
    const filterText = ref(
      composeFiltersHeader(desktopStore.getState().filterText)
    );
    const filtersOpened = ref(false);
    const api = new ApiController();
    const totalCount = ref(desktopStore.getState().totalCount);
    const totals = ref(`Нет записей`);
    const grid = ref();
    const isBusyRemoving = ref(false);
    const idBeingRemoved = ref<string | undefined>(undefined);
    const addButtonOptions = {
      onClick: async () => {
        await navigateToDetails(NewItemId, Desktops.RegulatorsRegistry);
      },
      icon: "add",
      text: "Создать",
      type: "success",
    };
    const refreshButtonOptions = {
      onClick: () => {
        desktopStore.clearCache();
        grid.value.refresh();
      },
      icon: "refresh",
      text: "Обновить",
      type: "default",
    };
    const isUserInSubdivisionsTree = ref(
      desktopStore.getState().isUserInSubdivisionsTree ?? true
    );
    watch(
      () => desktopStore.getState().isUserInSubdivisionsTree,
      (newValue) => {
        isUserInSubdivisionsTree.value = newValue ?? true;
      }
    );
    const onRemove = (item: RegistryItem) => {
      confirmData.id = item.Id;
      confirmData.comment = "";
      confirmData.isValid = false;
      confirmData.zone = item.entity.Zone.toString() ?? "";
      confirmData.shown = true;
    };
    const onDoRemove = async () => {
      const id = confirmData.id;
      if (isNullOrEmpty(id)) return;
      confirmData.shown = false;
      try {
        idBeingRemoved.value = id;
        isBusyRemoving.value = true;
        await api.remove(id, confirmData.comment);
        desktopStore.clearCache();
        grid.value.refresh();
        await refreshTotalCount();
        idBeingRemoved.value = undefined;
        isBusyRemoving.value = false;
      } catch (err) {
        idBeingRemoved.value = undefined;
        isBusyRemoving.value = false;
        toastError(
          `Произошла ошибка при попытке удалить объект на сервере: ${err.message}`
        );
      }
    };
    const onShowDetails = async (value: string, id: string) => {
      editCard.id = id;
      editCard.isShown = true;
      editCard.title = `Зона: ${value}`
    };
    /* ****************************
    Запрос данных реестра (порции для отображения)
    ******************************* */
    const onDataRequest = async (
      pair: SkipTake,
      sortField?: string,
      sortOrder?: string
    ) => {
      return await processRegistryDataRequestGeneric<
        RegistryItem,
        FiltersData,
        DefaultSettings<FiltersData>,
        RegulatorsRegistryDesktopStore
      >(
        desktopStore,
        (p, sf, so) =>
          api.getRegistry(
            p.skip,
            p.take,
            desktopStore.getState().filters,
            sf,
            so
          ),
        async () => {
          if (totalCount.value === 0) await refreshTotalCount();
        },
        (err) => {
          toastError(
            `Произошла ошибка при попытке получить данные с сервера: ${err.message}`
          );
        },
        pair,
        sortField,
        sortOrder
      );
    };
    const onCountRequest = async () => {
      await refreshTotalCount();
      return totalCount.value;
    };
    /* ****************************
    Экспорт данных реестра
    ******************************* */
    const exportButtonOptions = {
      onClick: () => {
        grid.value.exportToExcel(
          `${appStore
            .getState()
            .activeTitle?.replace(" / ", "_")}-${formatDateWithTime(
              new Date(),
              "_"
            )}`,
          () => api.getTotalCount(desktopStore.getState().filters),
          (skip: number, take: number) =>
            api.getRegistryForExport(
              skip,
              take,
              desktopStore.getState().filters,
              undefined,
              undefined
            );
      },
      icon: "exportxlsx",
      text: "Экспорт",
    };
    /* ****************************
    Запрос общего количества записей в реестре
    ******************************* */
    const refreshTotalCount = async () => {
      const n = await api.getTotalCount(desktopStore.getState().filters);
      desktopStore.setTotalCount(n);
      totalCount.value = n;
      totals.value = `Всего записей: ${n}`;
    };
    /* ****************************
    Инициализация фильтров
    ******************************* */
    const initializeFilters = async () => {
      filterText.value = composeFiltersHeader(
        desktopStore.getState().filterText
      );
    };
    /* ****************************
    Инициализация: проверим права доступа и запросим данные реестра.
    ******************************* */
    onMounted(async () => {
      await nextTick();
      gridOffsetTop.value = gridWrapper.value.getBoundingClientRect().y;
      if (!authStore.getState().accessRegulatorsRegistryDesktop)
        await navigateToNoAccess();
      else await refreshTotalCount();
      columns.value = Columns;
    });
    const onEditCardClose = () => {
      editCard.isShown = false;
    }
    /* ************************************
    Следим за изменением фильтров
    *************************************** */
    watch(
      () => desktopStore.getState().filters,
      async () => {
        filtersOpened.value = false;
        desktopStore.clearCache();
        grid.value.refresh();
      }
    );
    watch(
      () => desktopStore.getState().filterText,
      async (newText) => {
        filterText.value = composeFiltersHeader(newText);
      }
    );
    return {
      totals,
      totalCount,
      grid,
      editor,
      gridWrapper,
      gridOffsetTop,
      filterText,
      filtersOpened,
      isBusyRemoving,
      idBeingRemoved,
      isEditable: authStore.getState().editRegulatorsRegistry,
      desktopId: Desktops.RegulatorsRegistry,
      canSeeEditor: authStore.getState().editRegulatorsRegistry,
      confirmData,
      editCard,
      loadErrorMessageData,
      initializeFilters,
      columns,
      addButtonOptions,
      exportButtonOptions,
      refreshButtonOptions,
      onDataRequest,
      onCountRequest,
      onShowDetails,
      onRemove,
      onDoRemove,
      cardPopupAttrs,
      onEditCardClose
    };
  },
});
/* eslint-enable no-console */
