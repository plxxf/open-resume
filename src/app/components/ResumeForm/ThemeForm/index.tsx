import { BaseForm } from "components/ResumeForm/Form";
import { InputGroupWrapper } from "components/ResumeForm/Form/InputGroup";
import { InlineInput } from "components/ResumeForm/ThemeForm/InlineInput";
import {
  DocumentSizeSelections,
  FontSizeSelections,
} from "components/ResumeForm/ThemeForm/Selection";
import {
  changeSettings,
  selectSettings,
  type GeneralSetting,
} from "lib/redux/settingsSlice";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import {
  TEMPLATE_IDS,
  TEMPLATES,
  getTemplate,
} from "components/Resume/ResumePDF/templates";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { cx } from "lib/cx";

const BRAND_BLUE = "#2563eb";

export const ThemeForm = () => {
  const settings = useAppSelector(selectSettings);
  const { fontSize, documentSize } = settings;
  const selectedTemplate = getTemplate(settings.template).id;
  const dispatch = useAppDispatch();

  const handleSettingsChange = (field: GeneralSetting, value: string) => {
    dispatch(changeSettings({ field, value }));
  };

  return (
    <BaseForm>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <Cog6ToothIcon className="h-6 w-6 text-gray-600" aria-hidden="true" />
          <h1 className="text-lg font-semibold tracking-wide text-gray-900 ">
            Template and page
          </h1>
        </div>
        <div>
          <InputGroupWrapper label="Template" />
          <div
            className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3"
            role="radiogroup"
            aria-label="Template"
          >
            {TEMPLATE_IDS.map((id) => {
              const template = TEMPLATES[id];
              const isSelected = id === selectedTemplate;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSettingsChange("template", id)}
                  className={cx(
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition hover:border-blue-400",
                    isSelected
                      ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                      : "border-gray-300 bg-white"
                  )}
                >
                  <TemplateThumb id={id} />
                  <span className="flex flex-col">
                    <b className="text-sm text-gray-900">{template.name}</b>
                    <small className="text-xs text-gray-500">
                      {template.note}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <InlineInput
            label="Font Size (pt)"
            name="fontSize"
            value={fontSize}
            placeholder="11"
            onChange={handleSettingsChange}
          />
          <FontSizeSelections
            fontFamily="Roboto"
            themeColor={BRAND_BLUE}
            selectedFontSize={fontSize}
            handleSettingsChange={handleSettingsChange}
          />
        </div>
        <div>
          <InputGroupWrapper label="Paper size" />
          <DocumentSizeSelections
            themeColor={BRAND_BLUE}
            selectedDocumentSize={documentSize}
            handleSettingsChange={handleSettingsChange}
          />
        </div>
      </div>
    </BaseForm>
  );
};

/** Small paper sketch of each layout, like the cards on airesume.blog. */
const TemplateThumb = ({ id }: { id: string }) => {
  const line = "block h-[2px] rounded bg-slate-700/70";
  if (id === "modern") {
    return (
      <span className="flex h-[52px] w-[40px] flex-none overflow-hidden rounded-sm bg-white shadow">
        <span className="h-full w-[13px] bg-blue-100" />
        <span className="flex flex-1 flex-col gap-[4px] p-[5px]">
          <span className="block h-[3px] w-3/4 rounded bg-blue-600" />
          <span className={line} />
          <span className={line} />
          <span className={line} />
        </span>
      </span>
    );
  }
  return (
    <span className="flex h-[52px] w-[40px] flex-none flex-col gap-[4px] rounded-sm bg-white p-[5px] shadow">
      <span
        className={cx(
          "block h-[3px] w-2/3 rounded bg-slate-800",
          id === "classic" && "mx-auto"
        )}
      />
      {id === "standard" ? (
        <span className="block h-[4px] rounded bg-slate-200" />
      ) : (
        <span className="block h-[1px] bg-slate-800" />
      )}
      <span className={line} />
      <span className={line} />
      <span className={line} />
    </span>
  );
};
