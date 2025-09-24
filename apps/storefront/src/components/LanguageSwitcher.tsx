import { FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import type { SelectChangeEvent } from '@mui/material/Select'
import { Language, useI18n } from '../state/i18n'

type Props = {
  size?: 'small' | 'medium'
  fullWidth?: boolean
}

export default function LanguageSwitcher({ size = 'small', fullWidth }: Props) {
  const { language, languages, setLanguage, t } = useI18n()

  const handleChange = (event: SelectChangeEvent<string>) => {
    setLanguage(event.target.value as Language)
  }

  return (
    <FormControl size={size} fullWidth={fullWidth} variant="outlined">
      <InputLabel id="storefront-language-select">{t('i18n.label')}</InputLabel>
      <Select
        labelId="storefront-language-select"
        label={t('i18n.label')}
        value={language}
        onChange={handleChange}
      >
        {languages.map((item) => (
          <MenuItem key={item.code} value={item.code}>
            {item.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
